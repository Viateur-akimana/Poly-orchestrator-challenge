import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { TransferService, TransferStatus, TransferDirection } from '../services/transfer.service';
import { ServiceContainer } from '../services/service-container';
import { prisma } from '../lib/prisma';

export class TransferController {

  private transferService = new TransferService();
  private get exchangeRateService() {
    return ServiceContainer.exchangeRateService;
  }

  /**
   * Get exchange rate (bidirectional)
   */
  public getExchangeRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { amount = 1000, direction = 'RU_TO_RW' } = req.query;
      const sendAmount = parseFloat(amount as string);

      if (sendAmount <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Amount must be greater than 0' }
        });
        return;
      }

      let rateData;
      if (direction === 'RU_TO_RW') {
        rateData = await this.exchangeRateService.calculateRate(sendAmount);
        res.json({
          success: true,
          data: {
            direction: 'Russia to Rwanda',
            fromCurrency: 'RUB',
            toCurrency: 'RWF',
            sendAmount,
            receiveAmount: rateData.receiveAmount,
            exchangeRate: rateData.rate,
            commission: rateData.commission,
            totalAmount: rateData.totalAmount,
            processingTime: 'Manual verification (1-24 hours)',
            paymentMethod: 'Russian Bank Transfer',
            supportedMethods: ['Bank Transfer', 'Upload Receipt']
          }
        });
      } else {
        rateData = await this.exchangeRateService.calculateReverseRate(sendAmount);
        res.json({
          success: true,
          data: {
            direction: 'Rwanda to Russia',
            fromCurrency: 'RWF',
            toCurrency: 'RUB',
            sendAmount,
            receiveAmount: rateData.receiveAmount,
            exchangeRate: rateData.rate,
            commission: rateData.commission,
            totalAmount: rateData.totalAmount,
            processingTime: 'Real-time processing via MTN Mobile Money (1-2 minutes)',
            paymentMethod: 'MTN Mobile Money',
            supportedMethods: ['USSD (*182*7*1#)', 'MTN MoMo App']
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Create bidirectional transfer order
   */
  public createTransferOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        recipientName,
        recipientPhone,
        sendAmount,
        amountRUB,
        sendCurrency = 'RUB',
        receiveCurrency = 'RWF',
        direction = 'RU_TO_RW',
        notes
      } = req.body;

      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      // Get user info from request
      const senderName = `${req.user?.firstName || 'User'} ${req.user?.lastName || ''}`;
      const senderPhone = req.user?.phoneNumber || '';

      const result = await this.transferService.createTransferOrder({
        userId,
        senderName: senderName.trim(),
        senderPhone,
        recipientName,
        recipientPhone,
        sendAmount: parseFloat(sendAmount || amountRUB),
        sendCurrency,
        receiveCurrency,
        direction: direction as TransferDirection,
        notes
      });

      // Fetch current settings from database for instructions
      const settings = await prisma.systemSettings.findFirst();

      if (!settings || !settings.cardNumber || !settings.rwandaMobileMoney) {
        throw new Error('System payment settings not fully configured by administrator');
      }

      // Add manual payment instructions based on direction
      const manualPaymentInfo = direction === 'RU_TO_RW' 
        ? {
            ...result.paymentInfo,
            manualInstructions: {
              cardNumber: settings.cardNumber,
              cardHolder: settings.cardHolderName || 'SKYLINE TRANSFERS',
              reference: result.transfer.reference,
              steps: [
                'Transfer RUB to the card number above',
                'Include reference number in transfer comment',
                'Click "I Have Paid" button after transfer',
                'Money will be sent to Rwanda MTN within 1-3 minutes'
              ]
            }
          }
        : {
            ...result.paymentInfo,
            manualInstructions: {
              merchantId: settings.rwandaMobileMoney,
              businessName: settings.rwandaRecipientName || 'SKYLINE TRANSFERS',
              shortCode: '*182*7*1#',
              reference: result.transfer.reference,
              steps: [
                'Dial *182*7*1# on your MTN phone',
                `Enter Merchant ID: ${settings.rwandaMobileMoney}`,
                'Enter Amount: ' + sendAmount,
                'Enter PIN to confirm',
                'Upload screenshot of confirmation SMS'
              ]
            }
          };



      res.status(201).json({
        success: true,
        data: {
          transfer: result.transfer,
          paymentInfo: manualPaymentInfo,
          flow: result.flow
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Get user transfers
   */
  public getUserTransfers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { page = 1, limit = 20, reference, search, status, dateFrom, dateTo } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      const result = await this.transferService.getUserTransfers(
        userId,
        parseInt(page as string),
        parseInt(limit as string),
        reference as string | undefined,
        search as string | undefined,
        status as string | undefined,
        dateFrom as string | undefined,
        dateTo as string | undefined
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Track transfer by reference (public endpoint)
   */
  public trackTransferByReference = async (req: any, res: Response): Promise<void> => {
    try {
      const { reference } = req.params;

      if (!reference) {
        res.status(400).json({
          success: false,
          error: { message: 'Reference number is required' }
        });
        return;
      }

      const transfer = await this.transferService.getTransferByReference(reference);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: { message: 'Transfer not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: transfer
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Get specific transfer
   */
  public getTransfer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transferId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      // Validate transferId format
      if (!transferId || typeof transferId !== 'string' || transferId.length < 10) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid transfer ID format' }
        });
        return;
      }

      // Admins can view any transfer, users can only view their own
      const transfer = userRole === 'ADMIN'
        ? await this.transferService.getTransfer(transferId)
        : await this.transferService.getTransfer(transferId, userId);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: { message: 'Transfer not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: { transfer }
      });
    } catch (error: any) {
      console.error('Error fetching transfer:', error);
      const statusCode = error.message === 'Transfer not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: { message: statusCode === 500 ? 'Internal server error' : error.message }
      });
    }
  };

  /**
   * Cancel transfer
   */
  public cancelTransfer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transferId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      const transfer = await this.transferService.cancelTransfer(transferId, userId, reason);

      res.json({
        success: true,
        data: { transfer }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Get payment information (bidirectional)
   */
  public getPaymentInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { direction = 'RU_TO_RW' } = req.query;
      const paymentInfo = await this.transferService.getPaymentInfo(direction as TransferDirection);


      res.json({
        success: true,
        data: paymentInfo
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  // ============ ADMIN ENDPOINTS ============

  /**
   * Get all transfers (admin only)
   */
  public getAllTransfers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status, page = 1, limit = 50, search, dateFrom, dateTo } = req.query;

      const transfers = await this.transferService.getAllTransfers(
        parseInt(page as string),
        parseInt(limit as string),
        status as TransferStatus | undefined,
        search as string | undefined,
        dateFrom as string | undefined,
        dateTo as string | undefined
      );

      res.json({
        success: true,
        data: transfers
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Get transfer statistics (admin)
   */
  public getStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.transferService.getStatistics();

      res.json({
        success: true,
        data: {
          statistics: stats,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Process MTN disbursement manually (admin only, for failed auto-processing)
   */
  public processMTNDisbursement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transferId } = req.params;

      const transfer = await this.transferService.processMTNDisbursement(transferId);

      res.json({
        success: true,
        data: { transfer }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Admin approves payment - marks transfer as completed
   * Rwanda MTN payout is processed manually outside the system
   */
  public approvePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transferId } = req.params;
      const { adminNotes } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      const transfer = await this.transferService.adminApprovePayment(transferId, adminId, adminNotes);

      res.json({
        success: true,
        message: 'Payment approved. Please process payout manually.',
        data: {
          transfer,
          payoutDetails: {
            recipientPhone: transfer.recipientPhone,
            recipientName: transfer.recipientName,
            amount: Number(transfer.receiveAmount),
            currency: (transfer as any).toCurrency?.code || 'RWF',
            network: transfer.paymentMethodType === 'MOBILE_MONEY' ? 'Russian Bank' : 'MTN Rwanda'
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Admin rejects payment
   */
  public rejectPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transferId } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      if (!reason || !reason.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Rejection reason is required' }
        });
        return;
      }

      const transfer = await this.transferService.adminRejectPayment(transferId, adminId, reason);

      res.json({
        success: true,
        message: 'Payment rejected',
        data: { transfer }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Get transfers awaiting admin approval
   */
  public getTransfersAwaitingApproval = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 50 } = req.query;

      const result = await this.transferService.getTransfersAwaitingApproval(
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  // ============ PAYMENT PROOF ENDPOINTS ============

  /**
   * Upload payment proof for a transfer
   * User uploads proof of payment (screenshot/receipt) after manual bank transfer
   */
  public uploadPaymentProof = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transferId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      if (!transferId) {
        res.status(400).json({
          success: false,
          error: { message: 'Transfer ID is required' }
        });
        return;
      }

      // Extract file data from request
      // Assuming file upload middleware has processed and attached file info to req.body
      const { fileUrl, fileType, fileSize } = req.body;

      if (!fileUrl || !fileType) {
        res.status(400).json({
          success: false,
          error: { message: 'File URL and file type are required' }
        });
        return;
      }

      // Validate file size (max 10MB)
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        res.status(400).json({
          success: false,
          error: { message: 'File size must not exceed 10MB' }
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      if (!allowedTypes.includes(fileType)) {
        res.status(400).json({
          success: false,
          error: { message: 'Only PNG, JPG, and PDF files are allowed' }
        });
        return;
      }

      const result = await this.transferService.uploadPaymentProof(transferId, userId, {
        url: fileUrl,
        type: fileType,
        size: fileSize || 0
      });

      res.json({
        success: true,
        message: 'Payment proof uploaded successfully',
        data: {
          transfer: result,
          nextStep: 'Awaiting admin verification of payment proof'
        }
      });
    } catch (error: any) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Verify payment proof (admin only)
   * Admin reviews uploaded proof and marks payment as verified or rejected
   */
  public verifyPaymentProof = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transferId } = req.params;
      const { approved, notes } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      if (!transferId) {
        res.status(400).json({
          success: false,
          error: { message: 'Transfer ID is required' }
        });
        return;
      }

      if (typeof approved !== 'boolean') {
        res.status(400).json({
          success: false,
          error: { message: 'Approved status is required (true or false)' }
        });
        return;
      }

      if (!approved && (!notes || !notes.trim())) {
        res.status(400).json({
          success: false,
          error: { message: 'Rejection notes are required when rejecting proof' }
        });
        return;
      }

      const result = await this.transferService.verifyPaymentProof(transferId, adminId, approved, notes);

      res.json({
        success: true,
        message: approved ? 'Payment proof verified successfully' : 'Payment proof rejected',
        data: {
          transfer: result,
          status: approved ? 'VERIFIED' : 'REJECTED',
          nextStep: approved ? 'Payment will be processed to Rwanda MTN' : 'User will be notified of rejection'
        }
      });
    } catch (error: any) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: { message: error.message }
      });
    }
  };

  /**
   * Admin creates transfer order for a user
   */
  public adminCreateTransferOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        targetUserId,
        recipientName,
        recipientPhone,
        sendAmount,
        sendCurrency = 'RUB',
        receiveCurrency = 'RWF',
        direction = 'RU_TO_RW',
        notes,
        paymentChannel = 'unitpay'
      } = req.body;

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          error: { message: 'Target User ID is required' }
        });
        return;
      }

      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      });

      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: { message: 'Target user not found' }
        });
        return;
      }

      const senderName = `${targetUser.firstName || 'User'} ${targetUser.lastName || ''}`;
      const senderPhone = targetUser.phoneNumber || '';

      const result = await this.transferService.createTransferOrder({
        userId: targetUserId,
        senderName: senderName.trim(),
        senderPhone,
        recipientName,
        recipientPhone,
        sendAmount: parseFloat(sendAmount),
        sendCurrency,
        receiveCurrency,
        direction: direction as TransferDirection,
        notes,
        paymentMethodType: paymentChannel === 'unitpay' ? 'CREDIT_CARD' : (direction === 'RU_TO_RW' ? 'BANK_TRANSFER' : 'MOBILE_MONEY')
      });

      res.status(201).json({
        success: true,
        data: {
          transfer: result.transfer,
          flow: result.flow
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  };
}