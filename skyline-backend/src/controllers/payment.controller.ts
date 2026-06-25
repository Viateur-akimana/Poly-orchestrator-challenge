import { Request, Response } from 'express';
import { UnitPayService } from '../services/unitpay.service';
import { TransferService, TransferStatus, PaymentStatus } from '../services/transfer.service';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';

const logger = createLogger('PaymentController');

export class PaymentController {
  private unitPayService = new UnitPayService();
  private transferService = new TransferService();

  /**
   * Handle UnitPay callback (webhook)
   */
  public handleUnitPayCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { method, params } = req.query; // UnitPay usually sends via GET, but check both
      const callbackParams = Object.keys(params || {}).length > 0 ? params : req.body.params;
      const callbackMethod = method as string || req.body.method;

      if (!callbackMethod || !callbackParams) {
        res.status(400).json({ error: { message: 'Invalid callback data' } });
        return;
      }

      // 1. Verify Signature
      const isValid = this.unitPayService.verifyCallbackSignature(callbackMethod, callbackParams);
      if (!isValid) {
        logger.error('Invalid UnitPay signature', { method: callbackMethod, params: callbackParams });
        res.status(400).json({ error: { message: 'Invalid signature' } });
        return;
      }

      const reference = callbackParams.account;
      const sum = parseFloat(callbackParams.sum);

      // 2. Handle 'check' method
      if (callbackMethod === 'check') {
        const transfer = await this.transferService.getTransferByReference(reference);
        
        if (!transfer) {
          res.json({ result: { error: 'Transfer not found' } });
          return;
        }

        if (Math.abs(transfer.sendAmount - sum) > 0.01) {
          res.json({ result: { error: 'Amount mismatch' } });
          return;
        }

        res.json({ result: { message: 'Check successful' } });
        return;
      }

      // 3. Handle 'pay' method
      if (callbackMethod === 'pay') {
        logger.info(`Processing UnitPay payment for transfer: ${reference}`);
        
        const transfer = await prisma.transferOrder.findUnique({
          where: { reference }
        });

        if (!transfer) {
          res.json({ result: { error: 'Transfer not found' } });
          return;
        }

        if (transfer.paymentStatus === PaymentStatus.VERIFIED) {
          res.json({ result: { message: 'Payment already processed' } });
          return;
        }

        // Update transfer status
        await prisma.transferOrder.update({
          where: { id: transfer.id },
          data: {
            paymentStatus: PaymentStatus.VERIFIED,
            status: TransferStatus.PROCESSING,
            processedAt: new Date(),
            // Store UnitPay payment ID if needed
            notes: transfer.notes ? `${transfer.notes}\nUnitPay ID: ${callbackParams.unitpayId}` : `UnitPay ID: ${callbackParams.unitpayId}`
          }
        });

        // Trigger notifications or payout logic here if needed
        
        res.json({ result: { message: 'Payment successful' } });
        return;
      }

      // 4. Handle 'error' method
      if (callbackMethod === 'error') {
        logger.error(`UnitPay payment error for ${reference}: ${callbackParams.errorMessage}`);
        res.json({ result: { message: 'Error received' } });
        return;
      }

      res.status(400).json({ error: { message: 'Unknown method' } });
    } catch (error: any) {
      logger.error('Error handling UnitPay callback:', error);
      res.status(500).json({ error: { message: 'Internal server error' } });
    }
  };
}
