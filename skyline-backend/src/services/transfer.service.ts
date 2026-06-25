/**
 * Transfer Service
 * Handles Russia → Rwanda money transfers with manual bank payment verification
 */

import { TransferStatus, PaymentStatus, MobileNetwork, PaymentMethodType, NotificationType } from '@prisma/client';
import { prisma, Validators, createLogger, ValidationError, NotFoundError } from '../lib';
import { ServiceContainer } from './service-container';
import { emailService } from './email.service';
import { notificationService } from './notification.service';

const logger = createLogger('TransferService');

// Export types from Prisma
export { TransferStatus, PaymentStatus, MobileNetwork, PaymentMethodType } from '@prisma/client';

// Transfer direction enum
export enum TransferDirection {
  RU_TO_RW = 'RU_TO_RW', // Russia to Rwanda (Bank Transfer → MTN)
  RW_TO_RU = 'RW_TO_RU'  // Rwanda to Russia (MTN → Bank Transfer)
}


// Enhanced interface for bidirectional transfer creation
export interface CreateTransferData {
  userId: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientNetwork?: MobileNetwork;
  sendAmount: number;
  sendCurrency: 'RUB' | 'RWF';
  receiveCurrency: 'RWF' | 'RUB';
  direction: TransferDirection;
  deliveryMethod?: 'mobile_money' | 'bank_account';
  paymentMethodType?: 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_MONEY' | 'DIGITAL_WALLET' | 'OTHER';
  notes?: string;
}

export class TransferService {
  private get exchangeRateService() {
    return ServiceContainer.exchangeRateService;
  }

  /**
   * Create transfer order (Russia to Rwanda only)
   * Rwanda payout is processed manually by admin
   */
  async createTransferOrder(orderData: CreateTransferData) {
    if (orderData.direction === TransferDirection.RW_TO_RU) {
      return this.createRwandaToRussiaTransfer(orderData);
    }
    return this.createRussiaToRwandaTransfer(orderData);
  }

  /**
   * Create Russia to Rwanda transfer (SBP → MTN)
   */
  async createRussiaToRwandaTransfer(orderData: CreateTransferData) {
    try {
      // Validate RUB amount
      const validation = this.exchangeRateService.validateAmount(orderData.sendAmount);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Validate Rwanda phone number (only for mobile money)
      logger.info(`Validating transfer: method=${orderData.deliveryMethod}, phone/account=${orderData.recipientPhone}`);

      const isBankAccount = orderData.deliveryMethod === 'bank_account';
      if (!isBankAccount && !Validators.rwandaPhone(orderData.recipientPhone)) {
        throw new ValidationError('Invalid Rwanda phone number format. Use +250 7X XXX XXXX');
      }

      if (isNaN(orderData.sendAmount) || orderData.sendAmount <= 0) {
        throw new ValidationError('Invalid send amount');
      }

      // Calculate RUB to RWF exchange rate
      const rateData = await this.exchangeRateService.calculateRate(orderData.sendAmount);
      const reference = this.generateReference();

      // Get currency IDs
      const rubCurrency = await this.getOrCreateCurrency('RUB', 'Russian Ruble', '₽');
      const rwfCurrency = await this.getOrCreateCurrency('RWF', 'Rwandan Franc', 'FRw');

      const transfer = await prisma.transferOrder.create({
        data: {
          reference,
          user: { connect: { id: orderData.userId } },
          senderName: orderData.senderName,
          senderPhone: orderData.senderPhone,
          recipientName: orderData.recipientName,
          recipientPhone: orderData.recipientPhone,
          recipientNetwork: orderData.recipientNetwork || MobileNetwork.MTN,
          deliveryMethod: orderData.deliveryMethod || 'mobile_money',
          fromCurrency: { connect: { id: rubCurrency.id } },
          toCurrency: { connect: { id: rwfCurrency.id } },
          sendAmount: orderData.sendAmount,
          receiveAmount: rateData.receiveAmount,
          exchangeRate: rateData.rate,
          fee: rateData.commission,
          totalAmount: rateData.totalAmount,
          status: TransferStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethodType: PaymentMethodType.BANK_TRANSFER,
          notes: orderData.notes,
        },
        include: {
          fromCurrency: true,
          toCurrency: true,
          user: true,
        }
      });

      // Send notifications (non-blocking)
      this.sendNewTransferNotifications(transfer).catch(err => 
        logger.error('Failed to send new transfer notifications:', err)
      );

      logger.info(`Transfer created: ${reference} (${orderData.sendAmount} RUB → ${rateData.receiveAmount} RWF @ 18.4 rate)`);

      return {
        transfer,
        paymentInfo: {
          type: 'BANK_TRANSFER',
          amount: rateData.totalAmount,
          currency: 'RUB',
          reference: reference,
          description: `SKYLINE Transfer to ${orderData.recipientName}`,
          processingTime: 'Manual verification required',
          paymentMethods: ['BANK_TRANSFER'],
          instructions: [
            'Open your Sberbank app',
            'Transfer to the card number provided',
            'Enter the exact amount shown',
            'Take a screenshot of confirmation'
          ]
        },
        flow: {
          step1: 'User makes bank transfer to Sberbank card',
          step2: 'User uploads payment receipt/proof',
          step3: 'Admin verifies payment proof',
          step4: 'MTN disbursement to Rwanda',
          step5: 'Transfer completed'
        }
      };
    } catch (error) {
      logger.error('Error creating Russia to Rwanda transfer:', error);
      throw error;
    }
  }

  /**
   * Create Rwanda to Russia transfer (MTN → SBP/Bank)
   */
  async createRwandaToRussiaTransfer(orderData: CreateTransferData) {
    try {
      // Validate RWF amount
      const validation = this.exchangeRateService.validateRwfAmount(orderData.sendAmount);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      if (isNaN(orderData.sendAmount) || orderData.sendAmount <= 0) {
        throw new ValidationError('Invalid send amount');
      }

      // Validate recipient (Russia side) - basic validation
      if (!orderData.recipientPhone || orderData.recipientPhone.length < 10) {
        throw new ValidationError('Invalid recipient contact for Russia payout');
      }

      // Calculate RWF to RUB exchange rate
      const rateData = await this.exchangeRateService.calculateReverseRate(orderData.sendAmount);
      const reference = this.generateReference();

      // Get currency IDs
      const rubCurrency = await this.getOrCreateCurrency('RUB', 'Russian Ruble', '₽');
      const rwfCurrency = await this.getOrCreateCurrency('RWF', 'Rwandan Franc', 'FRw');

      const transfer = await prisma.transferOrder.create({
        data: {
          reference,
          user: { connect: { id: orderData.userId } },
          senderName: orderData.senderName,
          senderPhone: orderData.senderPhone,
          recipientName: orderData.recipientName,
          recipientPhone: orderData.recipientPhone,
          recipientNetwork: MobileNetwork.MTN, // Default for mobile money flow
          deliveryMethod: orderData.deliveryMethod || 'bank_account',
          fromCurrency: { connect: { id: rwfCurrency.id } },
          toCurrency: { connect: { id: rubCurrency.id } },
          sendAmount: orderData.sendAmount,
          receiveAmount: rateData.receiveAmount,
          exchangeRate: rateData.rate,
          fee: rateData.commission,
          totalAmount: orderData.sendAmount,
          status: TransferStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethodType: PaymentMethodType.MOBILE_MONEY,
          notes: orderData.notes,
        },
        include: {
          fromCurrency: true,
          toCurrency: true,
          user: true,
        }
      });

      // Send notifications (non-blocking)
      this.sendNewTransferNotifications(transfer).catch(err => 
        logger.error('Failed to send new transfer notifications:', err)
      );

      logger.info(`Transfer created: ${reference} (${orderData.sendAmount} RWF → ${rateData.receiveAmount} RUB)`);

      return {
        transfer,
        paymentInfo: {
          type: 'MOBILE_MONEY',
          amount: orderData.sendAmount,
          currency: 'RWF',
          reference: reference,
          description: `SKYLINE Transfer to ${orderData.recipientName}`,
          processingTime: 'Payout to Russia after verification',
          paymentMethods: ['MTN_MOMO'],
          instructions: [
            'Dial *182*7*1#',
            `Enter Merchant ID: 622020`,
            `Enter Amount: ${orderData.sendAmount}`,
            'Confirm with your Pin',
            'Wait for verification'
          ]
        },
        flow: {
          step1: 'User pays via MTN Mobile Money (*182*7*1#)',
          step2: 'System/Admin verifies payment receipt',
          step3: 'Payout initiated to Russian BankAccount/SBP',
          step4: 'Transfer completed'
        }
      };
    } catch (error) {
      logger.error('Error creating Rwanda to Russia transfer:', error);
      throw error;
    }
  }

  /**
   * Upload payment proof for verification
   */
  async uploadPaymentProof(transferId: string, userId: string, fileData: { url: string; type: string; size: number }): Promise<any> {
    try {
      const transfer = await prisma.transferOrder.findUnique({
        where: { id: transferId }
      });

      if (!transfer) {
        throw new NotFoundError('Transfer not found');
      }

      if (transfer.userId !== userId) {
        throw new ValidationError('Unauthorized: Transfer does not belong to this user');
      }

      if (transfer.paymentStatus !== PaymentStatus.PENDING) {
        throw new ValidationError('This transfer is not awaiting proof upload');
      }

      // Create payment proof record
      const proof = await prisma.paymentProof.create({
        data: {
          transferOrderId: transferId,
          fileUrl: fileData.url,
          fileType: fileData.type,
          fileSize: fileData.size,
          uploadedBy: userId,
        }
      });

      // Update transfer status
      const updatedTransfer = await prisma.transferOrder.update({
        where: { id: transferId },
        data: {
          paymentStatus: PaymentStatus.PENDING_VERIFICATION,
        },
        include: {
          paymentProofs: true,
          user: true,
          fromCurrency: true,
          toCurrency: true,
        }
      });

      // Send notification email
      if (updatedTransfer.user) {
        await emailService.sendProofUploadedEmail({
          senderEmail: updatedTransfer.user.email,
          senderName: updatedTransfer.user.firstName,
          reference: updatedTransfer.reference,
          amount: Number(updatedTransfer.sendAmount)
        }).catch(err => logger.error('Failed to send proof uploaded email:', err));
      }

      logger.info(`Payment proof uploaded for transfer: ${transfer.reference}`);

      return {
        success: true,
        transferId,
        paymentStatus: PaymentStatus.PENDING_VERIFICATION,
        message: 'Payment proof uploaded successfully. Awaiting admin verification.'
      };
    } catch (error) {
      logger.error('Error uploading payment proof:', error);
      throw error;
    }
  }

  /**
   * Verify payment proof (Admin only)
   */
  async verifyPaymentProof(transferId: string, adminId: string, approved: boolean, notes?: string): Promise<any> {
    try {
      const transfer = await prisma.transferOrder.findUnique({
        where: { id: transferId },
        include: {
          paymentProofs: true,
          user: true,
          fromCurrency: true,
          toCurrency: true,
        }
      });

      if (!transfer) {
        throw new NotFoundError('Transfer not found');
      }

      if (transfer.paymentStatus !== PaymentStatus.PENDING_VERIFICATION) {
        throw new ValidationError('This transfer is not awaiting proof verification');
      }

      if (approved) {
        // Update proof as verified
        await prisma.paymentProof.updateMany({
          where: { transferOrderId: transferId },
          data: {
            verified: true,
            verifiedBy: adminId,
            verifiedAt: new Date(),
          }
        });

        // Update transfer status to PROCESSING
        const updatedTransfer = await prisma.transferOrder.update({
          where: { id: transferId },
          data: {
            paymentStatus: PaymentStatus.VERIFIED,
            status: TransferStatus.PROCESSING,
            processedAt: new Date(),
            processedById: adminId
          },
          include: {
            paymentProofs: true,
            user: true,
            fromCurrency: true,
            toCurrency: true,
          }
        });

        // Send approval email
        if (updatedTransfer.user) {
          await emailService.sendPaymentVerifiedEmail({
            recipientEmail: updatedTransfer.user.email,
            recipientName: updatedTransfer.user.firstName,
            reference: updatedTransfer.reference,
            amount: Number(updatedTransfer.receiveAmount)
          }).catch(err => logger.error('Failed to send payment verified email:', err));
        }

        logger.info(`Payment verified for transfer: ${transfer.reference}`);

        return {
          success: true,
          transferId,
          paymentStatus: PaymentStatus.VERIFIED,
          status: TransferStatus.PROCESSING,
          message: 'Payment verified. Transfer is now processing.'
        };
      } else {
        // Reject proof
        await prisma.paymentProof.updateMany({
          where: { transferOrderId: transferId },
          data: {
            rejectionReason: notes || 'Rejected by admin',
            verifiedBy: adminId,
            verifiedAt: new Date(),
          }
        });

        // Update transfer status back to PENDING for new proof
        const updatedTransfer = await prisma.transferOrder.update({
          where: { id: transferId },
          data: {
            paymentStatus: PaymentStatus.PENDING,
          },
          include: {
            paymentProofs: true,
            user: true,
            fromCurrency: true,
            toCurrency: true,
          }
        });

        // Send rejection email
        if (updatedTransfer.user) {
          await emailService.sendPaymentRejectedEmail({
            senderEmail: updatedTransfer.user.email,
            senderName: updatedTransfer.user.firstName,
            reference: updatedTransfer.reference,
            reason: notes || 'Payment proof did not meet requirements'
          }).catch(err => logger.error('Failed to send payment rejected email:', err));
        }

        logger.info(`Payment rejected for transfer: ${transfer.reference}`);

        return {
          success: true,
          transferId,
          paymentStatus: PaymentStatus.PENDING,
          message: 'Payment proof rejected. User can upload new proof.'
        };
      }
    } catch (error) {
      logger.error('Error verifying payment proof:', error);
      throw error;
    }
  }

  /**
   * Get transfer by ID
   */
  async getTransfer(transferId: string, userId?: string) {
    try {
      // Validate input
      if (!transferId || typeof transferId !== 'string') {
        throw new Error('Invalid transfer ID');
      }

      const where: any = { id: transferId };
      if (userId) {
        where.userId = userId;
      }

      // Use findFirst when filtering by non-unique fields (userId)
      // Use findUnique only when querying by unique fields alone
      const transfer = userId
        ? await prisma.transferOrder.findFirst({
          where,
          include: {
            fromCurrency: true,
            toCurrency: true,
          }
        })
        : await prisma.transferOrder.findUnique({
          where: { id: transferId },
          include: {
            fromCurrency: true,
            toCurrency: true,
          }
        });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      // Transform the response to match frontend expectations
      return {
        ...transfer,
        amountRub: Number(transfer.sendAmount),
        amountRwf: Number(transfer.receiveAmount),
        exchangeRate: Number(transfer.exchangeRate),
        fee: Number(transfer.fee),
        totalAmount: Number(transfer.totalAmount)
      };
    } catch (error) {
      logger.error('Error getting transfer:', error);
      throw error;
    }
  }

  /**
   * Get user transfers with pagination
   */
  async getUserTransfers(
    userId: string,
    page = 1,
    limit = 20,
    reference?: string,
    search?: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string
  ) {
    try {
      const offset = (page - 1) * limit;

      const whereClause: any = { userId };

      // Add reference filter
      if (reference) {
        whereClause.reference = {
          contains: reference,
          mode: 'insensitive'
        };
      }

      // Add search filter (search by reference or recipient name)
      if (search) {
        whereClause.OR = [
          {
            reference: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            recipientName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }

      // Add status filter
      if (status) {
        whereClause.status = status;
      }

      // Add date range filter
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) {
          whereClause.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          whereClause.createdAt.lte = endDate;
        }
      }

      const [transfers, total] = await Promise.all([
        prisma.transferOrder.findMany({
          where: whereClause,
          include: {
            fromCurrency: true,
            toCurrency: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.transferOrder.count({
          where: whereClause
        })
      ]);

      return {
        transfers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user transfers:', error);
      throw error;
    }
  }

  async getTransferByReference(reference: string) {
    try {
      const transfer = await prisma.transferOrder.findUnique({
        where: { reference },
        include: {
          fromCurrency: true,
          toCurrency: true,
        }
      });

      if (!transfer) {
        return null;
      }

      // Return transfer data in the same format as other endpoints
      return {
        id: transfer.id,
        reference: transfer.reference,
        senderName: transfer.senderName,
        senderPhone: transfer.senderPhone,
        recipientName: transfer.recipientName,
        recipientPhone: transfer.recipientPhone,
        sendAmount: Number(transfer.sendAmount),
        receiveAmount: Number(transfer.receiveAmount),
        exchangeRate: Number(transfer.exchangeRate),
        fee: Number(transfer.fee),
        status: transfer.status,
        recipientNetwork: transfer.recipientNetwork,
        fromCurrency: transfer.fromCurrency,
        toCurrency: transfer.toCurrency,
        createdAt: transfer.createdAt,
        updatedAt: transfer.updatedAt
      };
    } catch (error) {
      logger.error('Error getting transfer by reference:', error);
      throw error;
    }
  }

  /**
   * Get all transfers (admin only)
   */
  async getAllTransfers(
    page = 1,
    limit = 50,
    status?: TransferStatus,
    search?: string,
    dateFrom?: string,
    dateTo?: string
  ) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};

      if (status) {
        where.status = status;
      }

      // Add search filter (search by reference or recipient name)
      if (search) {
        where.OR = [
          {
            reference: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            recipientName: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            senderName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }

      // Add date range filter
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = endDate;
        }
      }

      const [transfers, total] = await Promise.all([
        prisma.transferOrder.findMany({
          where,
          include: {
            fromCurrency: true,
            toCurrency: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.transferOrder.count({ where })
      ]);

      return {
        transfers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all transfers:', error);
      throw error;
    }
  }

  /**
   * Cancel transfer (only if still pending)
   */
  async cancelTransfer(transferId: string, userId: string, reason?: string) {
    try {
      const transfer = await prisma.transferOrder.findFirst({
        where: {
          id: transferId,
          userId: userId
        }
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== TransferStatus.PENDING) {
        throw new Error('Transfer cannot be cancelled at this stage');
      }

      const updatedTransfer = await prisma.transferOrder.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
          cancelledBy: userId,
        }
      });

      return updatedTransfer;
    } catch (error) {
      logger.error('Error cancelling transfer:', error);
      throw error;
    }
  }

  /**
   * Get payment information for both directions
   */
  /**
   * Get payment information for both directions from database
   */
  async getPaymentInfo(direction: TransferDirection) {
    if (direction === TransferDirection.RU_TO_RW) {
      return this.getSBPPaymentInfo();
    } else {
      return this.getMTNPaymentInfo();
    }
  }

  /**
   * Get manual payment information (for RU → RW) from database
   * Returns manual Sberbank card details for bank transfer
   */
  async getSBPPaymentInfo() {
    // Fetch settings from database
    const settings = await prisma.systemSettings.findFirst();

    if (!settings || !settings.cardNumber) {
      throw new Error('Sberbank payment details not configured in admin settings');
    }

    return {
      direction: 'Russia to Rwanda',
      paymentType: 'Manual Bank Transfer',
      paymentMethods: [
        {
          type: 'BANK_TRANSFER',
          name: 'Russian Bank Transfer',
          description: 'Send RUB to our Sberbank card',
          processingTime: 'Manual verification (1-24 hours)',
          fee: 'No commission (0 RUB)'
        }
      ],
      cardDetails: {
        bankName: 'Sberbank Russia',
        cardNumber: settings.cardNumber,
        cardHolder: settings.cardHolderName || 'SKYLINE TRANSFERS',
        currency: 'RUB'
      },
      instructions: [
        'Send exact RUB amount to the card number above',
        'Include transfer reference number in payment description',
        'Upload payment screenshot/receipt as proof',
        'Wait for admin verification (up to 24 hours)',
        'MTN payout will be processed after verification'
      ],
      features: [
        'No QR code or app required',
        'Manual verification process',
        'Secure bank card transfers',
        'Upload receipt for proof'
      ]
    };
  }

  /**
   * Get MTN payment information (for RW → RU) from database
   */
  async getMTNPaymentInfo() {
    // Fetch settings from database (MTN Merchant details)
    const settings = await prisma.systemSettings.findFirst();

    if (!settings || !settings.rwandaMobileMoney) {
      throw new Error('Rwanda MTN merchant details not configured in admin settings');
    }

    return {
      direction: 'Rwanda to Russia',
      paymentType: 'MTN Mobile Money',
      paymentMethods: [
        {
          type: 'USSD',
          name: 'USSD Payment',
          description: `Dial *182*7*1# and enter Merchant ID: ${settings.rwandaMobileMoney}`,
          processingTime: '1-2 minutes',
          fee: '1%'
        },
        {
          type: 'APP',
          name: 'MTN MoMo App',
          description: 'Use MTN Mobile Money app',
          processingTime: '1-2 minutes',
          fee: '1%'
        }
      ],
      merchantDetails: {
        merchantId: settings.rwandaMobileMoney,
        businessName: settings.rwandaRecipientName || 'SKYLINE TRANSFERS',
        ussdCode: '*182*7*1#'
      },

      supportedNetworks: ['MTN Rwanda'],
      features: [
        'USSD and app support',
        'Instant processing',
        'Widely accepted',
        'Secure mobile payments',
        'Local currency'
      ]
    };
  }


  /**
   * Get transfer statistics (admin)
   */
  async getStatistics() {
    try {
      const [
        totalTransfers,
        completedTransfers,
        pendingTransfers,
        failedTransfers,
        bankTransfers,
        mobileMoneyTransfers,
        totalVolumeRUB,
        totalVolumeRWF,
        todayTransfers
      ] = await Promise.all([
        prisma.transferOrder.count(),
        prisma.transferOrder.count({ where: { status: TransferStatus.COMPLETED } }),
        prisma.transferOrder.count({ where: { status: TransferStatus.PENDING_PAYMENT } }),
        prisma.transferOrder.count({ where: { status: TransferStatus.FAILED } }),
        prisma.transferOrder.count({ where: { paymentMethodType: PaymentMethodType.BANK_TRANSFER } }),
        prisma.transferOrder.count({ where: { paymentMethodType: PaymentMethodType.MOBILE_MONEY } }),
        // Sum of sendAmount (RUB - from currency)
        prisma.transferOrder.aggregate({
          _sum: { sendAmount: true }
        }),
        // Sum of receiveAmount (RWF - to currency)
        prisma.transferOrder.aggregate({
          _sum: { receiveAmount: true }
        }),
        prisma.transferOrder.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]);

      return {
        totalTransfers,
        completedTransfers,
        pendingTransfers,
        failedTransfers,
        bankTransfers,
        mobileMoneyTransfers,
        totalVolumeRUB: Number(totalVolumeRUB._sum.sendAmount) || 0,
        totalVolumeRWF: Number(totalVolumeRWF._sum.receiveAmount) || 0,
        todayTransfers,
        completionRate: totalTransfers > 0 ? ((completedTransfers / totalTransfers) * 100).toFixed(2) : '0',
        paymentMethodSplit: {
          bankTransfer: bankTransfers,
          mobileMoneyTransfer: mobileMoneyTransfers
        }
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      throw error;
    }
  }

  // Helper methods
  private generateReference(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `TRF${year}${month}${day}${random}`;
  }

  private async getOrCreateCurrency(code: string, name: string, symbol: string) {
    let currency = await prisma.currency.findUnique({
      where: { code }
    });

    if (!currency) {
      currency = await prisma.currency.create({
        data: {
          code,
          name,
          symbol,
          isActive: true,
          isFiat: true,
          decimals: 2
        }
      });
    }

    return currency;
  }

  private validateRussianPhone(phone: string): boolean {
    // Russian phone number validation
    const russianPhoneRegex = /^(\+7|8)[\d]{10}$/;
    return russianPhoneRegex.test(phone);
  }

  /**
   * Update transfer status
   */
  async updateTransferStatus(transferId: string, status: TransferStatus) {
    try {
      const updatedTransfer = await prisma.transferOrder.update({
        where: { id: transferId },
        data: {
          status,
          ...(status === TransferStatus.PROCESSING && { paymentStatus: PaymentStatus.VERIFIED, paidAt: new Date() }),
          ...(status === TransferStatus.COMPLETED && { completedAt: new Date(), processedAt: new Date() })
        }
      });

      return updatedTransfer;
    } catch (error) {
      logger.error('Error updating transfer status:', error);
      throw error;
    }
  }

  /**
   * Process MTN disbursement - DEPRECATED
   * Rwanda payouts are now processed manually by admin
   */
  async processMTNDisbursement(transferId: string) {
    throw new Error('MTN disbursement is disabled. Rwanda payouts are processed manually by admin.');
  }

  /**
   * Process MTN payout - DEPRECATED
   * Rwanda payouts are now processed manually by admin
   */
  async processMTNPayout(transferId: string) {
    return {
      success: false,
      error: 'MTN disbursement is disabled. Use admin approval flow instead.',
      message: 'Rwanda payouts are processed manually by admin after approval.'
    };
  }

  /**
   * Admin approves payment and marks transfer as completed
   * Rwanda payout is processed manually outside the system
   */
  async adminApprovePayment(transferId: string, adminId: string, adminNotes?: string) {
    try {
      const transfer = await prisma.transferOrder.findUnique({
        where: { id: transferId },
        include: { fromCurrency: true, toCurrency: true }
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      // Allow approval from both PENDING_PAYMENT and PAID_AWAITING_APPROVAL statuses
      if (transfer.status !== TransferStatus.PAID_AWAITING_APPROVAL && transfer.status !== TransferStatus.PENDING_PAYMENT) {
        throw new Error('Transfer is not awaiting approval');
      }

      // Mark transfer as completed - admin will process Rwanda payout manually
      const updatedTransfer = await prisma.transferOrder.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.COMPLETED,
          processedById: adminId,
          processedAt: new Date(),
          completedAt: new Date(),
          adminNotes: adminNotes || `Approved by admin. Rwanda MTN payout to be processed manually to ${transfer.recipientPhone}`,
        },
        include: {
          fromCurrency: true,
          toCurrency: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      console.log(`Transfer ${transfer.reference} approved by admin ${adminId}. MTN payout to ${transfer.recipientPhone} for ${transfer.receiveAmount} RWF to be processed manually.`);

      // Send completion email notification to user
      if (updatedTransfer.user?.email) {
        await emailService.sendTransferCompletedEmail({
          recipientEmail: updatedTransfer.user.email,
          recipientName: updatedTransfer.user.firstName || 'Customer',
          senderName: updatedTransfer.senderName,
          amount: Number(updatedTransfer.sendAmount),
          currency: 'RUB',
          receiveAmount: Number(updatedTransfer.receiveAmount),
          receiveCurrency: 'RWF',
          reference: updatedTransfer.reference,
          status: 'COMPLETED'
        });
      }

      return updatedTransfer;
    } catch (error) {
      logger.error('Error approving payment:', error);
      throw error;
    }
  }

  /**
   * Admin rejects payment
   */
  async adminRejectPayment(transferId: string, adminId: string, reason: string) {
    try {
      const transfer = await prisma.transferOrder.findUnique({
        where: { id: transferId }
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      // Allow rejection from both PENDING_PAYMENT and PAID_AWAITING_APPROVAL statuses
      if (transfer.status !== TransferStatus.PAID_AWAITING_APPROVAL && transfer.status !== TransferStatus.PENDING_PAYMENT) {
        throw new Error('Transfer is not awaiting approval');
      }

      const updatedTransfer = await prisma.transferOrder.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.FAILED,
          paymentStatus: PaymentStatus.REJECTED,
          processedById: adminId,
          processedAt: new Date(),
          adminNotes: `Rejected: ${reason}`,
          cancellationReason: reason,
        },
        include: {
          fromCurrency: true,
          toCurrency: true,
        }
      });

      console.log(`Transfer ${transfer.reference} rejected by admin ${adminId}. Reason: ${reason}`);

      return updatedTransfer;
    } catch (error) {
      logger.error('Error rejecting payment:', error);
      throw error;
    }
  }

  /**
   * Get transfers awaiting admin approval
   */
  async getTransfersAwaitingApproval(page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;

      const [transfers, total] = await Promise.all([
        prisma.transferOrder.findMany({
          where: { status: TransferStatus.PAID_AWAITING_APPROVAL },
          include: {
            fromCurrency: true,
            toCurrency: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { paidAt: 'asc' }, // Oldest paid first
          skip: offset,
          take: limit,
        }),
        prisma.transferOrder.count({ where: { status: TransferStatus.PAID_AWAITING_APPROVAL } })
      ]);

      return {
        transfers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting transfers awaiting approval:', error);
      throw error;
    }
  }
  /**
   * Helper to send notifications for new transfers
   */
  private async sendNewTransferNotifications(transfer: any) {
    try {
      // 1. Create DB notification for user
      if (transfer.user && transfer.user.id) {
        await notificationService.createNotification({
          userId: transfer.user.id,
          type: NotificationType.TRANSFER_CREATED,
          title: 'Transfer Created',
          message: `Your transfer ${transfer.reference} of ${transfer.sendAmount} ${transfer.fromCurrency.code} has been created.`,
          data: { reference: transfer.reference },
          channels: ['WEB', 'EMAIL']
        }).catch(err => logger.error('Failed to create user DB notification:', err));

        // 2. Send email to user
        await emailService.sendTransferCreatedEmail({
          recipientEmail: transfer.user.email,
          recipientName: transfer.user.firstName,
          senderName: transfer.senderName,
          amount: Number(transfer.sendAmount),
          currency: transfer.fromCurrency.code,
          receiveAmount: Number(transfer.receiveAmount),
          receiveCurrency: transfer.toCurrency.code,
          reference: transfer.reference,
          status: transfer.status,
        }).catch(err => logger.error('Failed to send user email:', err));
      }

      // 3. Notify all admins in DB
      await notificationService.notifyAdmins({
        title: 'New Transfer Order',
        message: `${transfer.senderName} created a transfer order ${transfer.reference} of ${transfer.sendAmount} ${transfer.fromCurrency.code}`,
        type: NotificationType.ADMIN_ALERT,
        payload: { reference: transfer.reference, amount: transfer.sendAmount }
      }).catch(err => logger.error('Failed to notify admins (DB):', err));

      // 4. Send email to admin
      await emailService.sendAdminNewOrderNotification(transfer).catch(err => 
        logger.error('Failed to send admin email:', err)
      );

      logger.info(`New transfer notifications processed for ${transfer.reference}`);
    } catch (error) {
      logger.error(`Error in sendNewTransferNotifications for ${transfer.reference}:`, error);
    }
  }
}