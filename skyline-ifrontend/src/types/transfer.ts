export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export enum MobileNetwork {
  MTN = 'MTN',
  AIRTEL = 'AIRTEL',
  TIGO = 'TIGO',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
}

export enum TransferStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID_AWAITING_APPROVAL = 'PAID_AWAITING_APPROVAL',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED',
}

export interface BankAlert {
  transferId: string;
  amount: number;
  currency: string;
  bank: string;
  timestamp: Date | string;
  verified: boolean;
  confidence: number;
  score?: number; // Alternative to confidence
  source?: string; // Alternative to bank
}

export interface CreateTransferOrderDto {
  // Sender information
  senderName: string;
  senderPhone: string;

  // Recipient information
  recipientName: string;
  recipientPhone: string;
  recipientNetwork: MobileNetwork;

  // Transfer amounts
  amountRwf: number;
  amountRub: number;
  sendAmount?: number;
  receiveAmount?: number;
  exchangeRate: number;
  fee: number;
  totalAmount: number;

  // Payment details
  paymentMethod: PaymentMethod;
  paymentProofId?: string;
  paymentProofUrl?: string;

  // Additional information
  notes?: string;
  deliveryMethod?: 'mobile_money' | 'bank_account';
  direction?: 'RU_TO_RW' | 'RW_TO_RU';
  sendCurrency?: string;
  receiveCurrency?: string;

  // System fields
  reference?: string;
  status?: TransferStatus;
}

export interface CancelTransferOrderDto {
  reason: string;
}

export interface TransferOrderDto extends Omit<CreateTransferOrderDto, 'paymentProofId'> {
  id: string;
  reference: string;
  status: TransferStatus;

  // Payment verification
  paymentStatus?: PaymentStatus;
  verificationData?: BankAlert;

  // MTN Integration
  mtnTransactionId?: string;
  mtnResponse?: any;

  // Timestamps
  paidAt?: Date | null;
  processedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;

  // Additional fields from the server
  fromCurrency?: Currency;
  toCurrency?: Currency;
  paymentProofs?: {
    id: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    verified: boolean;
    createdAt: Date | string;
  }[];
}

export interface TransferOrderListDto {
  data: TransferOrderDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentProofDto {
  id: string;
  transferOrderId: string;
  url: string;
  key: string;
  size: number;
  type: string;
  metadata?: Record<string, any>;
  uploadedAt: Date | string;
  expiresAt?: Date | string | null;
}

export interface ExchangeRateDto {
  fromCurrency: string;
  toCurrency: string;
  rate: number;  // User rate (markup rate - what they actually pay)
  amount: number;
  convertedAmount: number;
  fee: number;
  totalAmount: number;
  expiresAt: Date | string;
  timestamp: Date | string;
}

export interface BankAccountDto {
  bankName: string;
  accountNumber: string;
  accountName: string;
  branchCode?: string;
  currency: string;
  isDefault?: boolean;
}

export interface TransferOrderStats {
  totalTransfers: number;
  totalAmountRUB: number;
  totalAmountRWF: number;
  totalFees: number;
  pendingTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  averageProcessingTime: number; // in minutes
}

export interface TransferOrderFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  recipientPhone?: string;
  reference?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
