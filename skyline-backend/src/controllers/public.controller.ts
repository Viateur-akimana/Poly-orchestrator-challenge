import { Request, Response } from 'express';
import { ServiceContainer } from '../services/service-container';
import { prisma } from '../lib/prisma';

export class PublicController {
  private get exchangeRateService() {
    return ServiceContainer.exchangeRateService;
  }

  /**
   * Get public exchange rate (RUB to RWF)
   */
  public getExchangeRate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { amount = 1000, from = 'RUB', to = 'RWF' } = req.query;
      const sendAmount = parseFloat(amount as string);

      if (sendAmount <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Amount must be greater than 0' }
        });
        return;
      }

      let rateData;
      if (from === 'RUB' && to === 'RWF') {
        rateData = await this.exchangeRateService.calculateRate(sendAmount);
      } else {
        rateData = await this.exchangeRateService.calculateReverseRate(sendAmount);
      }

      res.json({
        success: true,
        data: {
          fromCurrency: from,
          toCurrency: to,
          sendAmount,
          receiveAmount: rateData.receiveAmount,
          exchangeRate: rateData.rate,
          commission: rateData.commission,
          totalAmount: rateData.totalAmount,
          processingTime: from === 'RUB' ? 'Within hours' : 'Instant after verification',
          lastUpdated: rateData.lastUpdated
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get exchange rate' }
      });
    }
  };

  /**
   * Get bank card details for payments from database
   */
  public getBankDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get settings from database
      const settings = await prisma.systemSettings.findFirst();

      if (!settings) {
        res.status(404).json({
          success: false,
          error: { message: 'Bank details not configured by administrator' }
        });
        return;
      }

      const bankDetails = {
        cardNumber: settings.cardNumber,
        cardHolder: settings.cardHolderName,
        bankName: 'Sberbank',
        currency: 'RUB',
        rwandaMobileMoney: settings.rwandaMobileMoney,
        rwandaRecipientName: settings.rwandaRecipientName
      };

      // Check if critical fields are missing
      if (!bankDetails.cardNumber || !bankDetails.rwandaMobileMoney) {
        res.status(404).json({
          success: false,
          error: { message: 'Bank details incomplete' }
        });
        return;
      }

      res.json({
        success: true,
        data: bankDetails
      });
    } catch (error) {

      console.error('Error fetching bank details from DB:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get bank details' }
      });
    }
  };
}