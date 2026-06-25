// External provider specific types (SBP, Wise, MTN)

// SBP (Sberbank) types
export type SbpRegisterOrderResponse = {
  orderId: string;
  formUrl: string;
};

export type SbpQrCodeResponse = {
  qrcode: string;
};

export type SbpRefundResponse = {
  errorCode: string;
  errorMessage?: string;
};

export type SbpOrderStatusResponse = {
  orderStatus: number;
  actionCode: number;
  actionCodeDescription: string;
};

// Wise types
export type WiseQuoteResponse = {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  allowedProfileTypes: string[];
  guaranteedTargetAmount: boolean;
  ofSourceAmount: boolean;
};

export type WiseRecipientResponse = {
  id: number;
  profile: number;
  accountHolderName: string;
  currency: string;
  details: Record<string, any>;
};

export type WiseTransferResponse = {
  id: string | number;
  status: string;
  quoteUuid: string;
  targetAccount: number;
};

export type WiseFundingResponse = {
  type: string;
  status: string;
};

export type ProviderError = {
  provider: 'SBP' | 'WISE' | 'MTN';
  code?: string | number;
  message: string;
  httpStatus?: number;
  details?: any;
};
