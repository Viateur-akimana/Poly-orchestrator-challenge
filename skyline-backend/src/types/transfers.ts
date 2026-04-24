// Transfer-related TypeScript types and DTOs

import { PaymentMethodType, PaymentStatus, TransferStatus } from '@prisma/client';

export enum TransferDirection {
  RU_TO_RW = 'RU_TO_RW',
  RW_TO_RU = 'RW_TO_RU',
}

export type CreateTransferRequestDTO = {
  userId: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  sendAmount: number;
  sendCurrency: 'RUB' | 'RWF';
  receiveCurrency: 'RWF' | 'RUB';
  direction: TransferDirection;
  notes?: string;
  idempotencyKey?: string;
};

export type PaymentInfoDTO = {
  type: 'SBP' | 'MTN_COLLECTION';
  amount: number;
  currency: 'RUB' | 'RWF';
  reference: string;
  description: string;
  processingTime: string;
  paymentMethods: string[];
  qrCode?: string;
  deepLink?: string;
  mtnReference?: string;
  instructions?: string;
};

export type CreateTransferResponseDTO = {
  transfer: any; // Prisma.TransferOrder including relations
  paymentInfo: PaymentInfoDTO;
  flow: Record<string, string>;
};

export type PaymentConfirmationDTO = {
  transferId: string;
  provider: 'SBP' | 'MTN' | 'WISE';
  providerTransactionId: string;
  amount: number;
  rawPayload?: any;
  signature?: string;
};

export type TransferStatusResponseDTO = {
  id: string;
  reference: string;
  status: TransferStatus;
  paymentStatus: PaymentStatus;
  paymentMethodType: PaymentMethodType;
  sendAmount: number;
  receiveAmount: number;
  fee: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type WebhookVerificationResult = {
  valid: boolean;
  reason?: string;
};
