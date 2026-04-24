import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ServiceContainer } from '../services/service-container';
import { prisma } from '../lib/prisma';

export class SystemController {
  /**
   * Get system overview and features
   */
  public getSystemOverview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const overview = {
        name: 'SKYLINE Transfers',
        description: 'Secure, transparent, and affordable money transfer service from Russia to Rwanda',

        businessModel: {
          commission: 'No commission per transfer',
          revenueModel: 'Service-based',
          targetMarket: 'Rwandans residing in Russia'
        },

        keyFeatures: {
          clientProfile: {
            description: 'Complete user management with login information and KYC',
          },

          transferHistory: {
            description: 'Complete history of transfers and their status',
          },

          transparentRates: {
            description: 'Real-time exchange rate checking with transparent pricing',
          },

          securePayments: {
            description: 'Russian bank transfer payments with proof upload',
          },

          fastProcessing: {
            description: 'Fast and safe transfers using Rwanda inventory system',
          },
        },

        transferWorkflow: {
          title: 'Complete Transfer Process',
          steps: [
            {
              step: 1,
              title: 'Order Creation',
              description: 'Client places transfer order'
            },
            {
              step: 2,
              title: 'Russian Payment',
              description: 'Client pays via Russian bank transfer'
            },
            {
              step: 3,
              title: 'Proof Upload',
              description: 'Client uploads payment proof'
            },
            {
              step: 4,
              title: 'Admin Verification',
              description: 'SKYLINE admin verifies payment'
            },
            {
              step: 5,
              title: 'MTN Payment',
              description: 'System/Admin sends money via MTN Mobile Money'
            },
            {
              step: 6,
              title: 'Completion',
              description: 'Transfer completed'
            }
          ]
        },

        securityFeatures: [
          'JWT authentication',
          'Role-based access control',
          'Payment proof verification',
          'Secure file upload'
        ],

        apiEndpoints: {
          public: [
            'GET /api/transfer-orders/exchange-rate',
            'GET /api/transfer-orders/bank-details'
          ],
          user: [
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/transfer-orders',
            'GET /api/transfer-orders',
            'POST /api/transfer-orders/:id/payment-proof'
          ],
          admin: [
            'GET /api/transfer-orders/admin/all',
            'POST /api/transfer-orders/:id/verify'
          ]
        }
      };

      res.json({
        success: true,
        data: overview,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get system overview' }
      });
    }
  };

  /**
   * Get system health and statistics
   */
  public getSystemHealth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const health = {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get system health' }
      });
    }
  };

  /**
   * Get card settings (masked) - for admin dashboard
   */
  public getCardSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      let settings: any = null;

      try {
        const { prisma } = await import('../lib/prisma');
        settings = await prisma.systemSettings.findFirst();

        // Create default if doesn't exist
        if (!settings) {
          settings = await prisma.systemSettings.create({
            data: {
              cardNumber: null,
              cardHolderName: null,
            }
          });
        }
      } catch (dbError) {
        console.warn('SystemSettings DB access failed, returning defaults:', dbError);
        // Return empty defaults so the frontend does not crash
        settings = {
          cardNumber: '',
          cardHolderName: '',
          rwandaMobileMoney: '',
          rwandaRecipientName: '',
          rwandaBankAccount: '',
        };
      }

      res.json({
        success: true,
        data: {
          cardNumber: settings.cardNumber || '',
          cardHolderName: settings.cardHolderName || '',
          rwandaMobileMoney: settings.rwandaMobileMoney || '',
          rwandaRecipientName: settings.rwandaRecipientName || '',
          rwandaBankAccount: settings.rwandaBankAccount || '',
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get card settings' }
      });
    }
  };

  /**
   * Update card settings - for admin
   */
  public updateCardSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cardNumber, cardHolderName, rwandaMobileMoney, rwandaRecipientName, rwandaBankAccount } = req.body;

      // Validate input
      if (!cardNumber && !cardHolderName && !rwandaMobileMoney && !rwandaRecipientName) {
        res.status(400).json({
          success: false,
          error: { message: 'At least one field (cardNumber or cardHolderName) is required' }
        });
        return;
      }

      const { prisma } = await import('../lib/prisma');

      // Get or create settings
      let settings = await prisma.systemSettings.findFirst();
      if (!settings) {
        settings = await prisma.systemSettings.create({
          data: {
            cardNumber: cardNumber || null,
            cardHolderName: cardHolderName || null,
            rwandaMobileMoney: rwandaMobileMoney || null,
            rwandaRecipientName: rwandaRecipientName || null,
            rwandaBankAccount: rwandaBankAccount || null,
          }
        });
      } else {
        settings = await prisma.systemSettings.update({
          where: { id: settings.id },
          data: {
            ...(cardNumber !== undefined && { cardNumber: cardNumber || null }),
            ...(cardHolderName !== undefined && { cardHolderName: cardHolderName || null }),
            ...(rwandaMobileMoney !== undefined && { rwandaMobileMoney: rwandaMobileMoney || null }),
            ...(rwandaRecipientName !== undefined && { rwandaRecipientName: rwandaRecipientName || null }),
            ...(rwandaBankAccount !== undefined && { rwandaBankAccount: rwandaBankAccount || null }),
          }
        });
      }

      res.json({
        success: true,
        message: 'System settings updated successfully',
        data: {
          cardNumber: settings.cardNumber || '',
          cardHolderName: settings.cardHolderName || '',
          rwandaMobileMoney: settings.rwandaMobileMoney || '',
          rwandaRecipientName: settings.rwandaRecipientName || '',
          rwandaBankAccount: settings.rwandaBankAccount || '',
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to update card settings' }
      });
    }
  };

  /**
   * Get current exchange rate settings
   */
  public getExchangeRateSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rate = ServiceContainer.exchangeRateService.getCurrentRate();

      res.json({
        success: true,
        data: {
          rubToRwf: rate.rubToRwf,
          rwfToRub: rate.rwfToRub,
          commission: rate.commission,
          lastUpdated: rate.lastUpdated,
          source: rate.source
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get exchange rate settings' }
      });
    }
  };

  /**
   * Update current exchange rate
   */
  public updateExchangeRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { rubToRwf, rwfToRub } = req.body;

      if (!rubToRwf || isNaN(Number(rubToRwf)) || Number(rubToRwf) <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'A valid positive RUB to RWF exchange rate is required' }
        });
        return;
      }

      // Update in-memory service
      const result = ServiceContainer.exchangeRateService.updateRate(Number(rubToRwf), rwfToRub ? Number(rwfToRub) : undefined);

      // Also persist to database
      try {
        const rubCurrency = await prisma.currency.findUnique({ where: { code: 'RUB' } });
        const rwfCurrency = await prisma.currency.findUnique({ where: { code: 'RWF' } });

        if (rubCurrency && rwfCurrency) {
          // RUB to RWF
          await prisma.exchangeRate.upsert({
            where: {
              fromCurrencyId_toCurrencyId: {
                fromCurrencyId: rubCurrency.id,
                toCurrencyId: rwfCurrency.id
              }
            },
            update: {
              rate: result.rubToRwf,
              updatedBy: req.user?.userId,
              source: 'manual'
            },
            create: {
              fromCurrencyId: rubCurrency.id,
              toCurrencyId: rwfCurrency.id,
              rate: result.rubToRwf,
              spread: 0,
              isActive: true,
              createdBy: req.user?.userId,
              source: 'manual'
            }
          });

          // RWF to RUB
          await prisma.exchangeRate.upsert({
            where: {
              fromCurrencyId_toCurrencyId: {
                fromCurrencyId: rwfCurrency.id,
                toCurrencyId: rubCurrency.id
              }
            },
            update: {
              rate: result.rwfToRub,
              updatedBy: req.user?.userId,
              source: 'manual'
            },
            create: {
              fromCurrencyId: rwfCurrency.id,
              toCurrencyId: rubCurrency.id,
              rate: result.rwfToRub,
              spread: 0,
              isActive: true,
              createdBy: req.user?.userId,
              source: 'manual'
            }
          });
        }
      } catch (dbError) {
        console.error('Failed to persist exchange rate to DB:', dbError);
      }

      res.json({
        success: true,
        message: 'Exchange rates updated successfully',
        data: {
          rubToRwf: result.rubToRwf,
          rwfToRub: result.rwfToRub,
          lastUpdated: result.lastUpdated
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to update exchange rate' }
      });
    }
  };
}
