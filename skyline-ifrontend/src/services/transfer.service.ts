import {
  CreateTransferOrderDto,
  PaymentProofDto,
  TransferOrderDto,
  TransferOrderListDto,
  ExchangeRateDto,
  BankAccountDto,
  TransferOrderStats,
  TransferOrderFilters,
  CancelTransferOrderDto,
  MobileNetwork,
  PaymentMethod,
  TransferStatus
} from '@/types/transfer';
import apiClient from '@/lib/apiClient';
import { FileUploadResponse, FileWithPreview, UploadProgressCallback } from '@/types/file-upload';

// Re-export types for easier imports
export type {
  CreateTransferOrderDto,
  PaymentProofDto,
  TransferOrderDto,
  TransferOrderListDto,
  ExchangeRateDto,
  BankAccountDto,
  TransferOrderStats,
  TransferOrderFilters,
  CancelTransferOrderDto
} from '@/types/transfer';

export { MobileNetwork, PaymentMethod, TransferStatus } from '@/types/transfer';

export const transferService = {
  // Create a new transfer order (matches backend endpoint exactly)
  async createTransferOrder(data: any): Promise<TransferOrderDto> {
    const requestData = {
      senderName: data.senderName,
      senderPhone: data.senderPhone,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientNetwork: data.recipientNetwork || 'MTN',
      sendAmount: data.sendAmount,
      amountRUB: data.amountRUB || data.sendAmount,
      sendCurrency: data.sendCurrency,
      receiveCurrency: data.receiveCurrency,
      direction: data.direction,
      paymentMethod: data.paymentMethod || 'RUSSIAN_BANK_TRANSFER',
      deliveryMethod: data.deliveryMethod,
      notes: data.notes || ''
    };

    const response = await apiClient.post('/transfers', requestData);
    return response.data.data;
  },

  // NEW BIDIRECTIONAL API METHODS

  // Get transfer quote for bidirectional transfers
  async getTransferQuote(amount: number, direction: 'RUB_TO_RWF' | 'RWF_TO_RUB'): Promise<any> {
    const response = await apiClient.get('/transfers/quote', {
      params: { amount, direction }
    });
    return response.data;
  },

  // Create bidirectional transfer
  async createTransfer(data: any): Promise<any> {
    const response = await apiClient.post('/transfers/create', data);
    return response.data;
  },

  // Get transfer status
  async getTransferStatus(transferId: string): Promise<any> {
    const response = await apiClient.get(`/transfers/status/${transferId}`);
    return response.data;
  },

  // Get user transfer history
  async getUserTransfers(params?: any): Promise<any> {
    const response = await apiClient.get('/transfers/my-history', { params });
    return response.data;
  },

  // Get supported transfer directions
  async getSupportedDirections(): Promise<any> {
    const response = await apiClient.get('/transfers/supported-directions');
    return response.data;
  },

  // Cancel transfer
  async cancelBidirectionalTransfer(transferId: string, reason?: string): Promise<any> {
    const response = await apiClient.post(`/transfers/${transferId}/cancel`, { reason });
    return response.data;
  },

  // Get a transfer order by ID
  async getTransferOrder(id: string): Promise<TransferOrderDto> {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid transfer ID');
      }

      const response = await apiClient.get(`/transfers/${id}`);

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Failed to fetch transfer');
      }

      return response.data.data.transfer || response.data.data;
    } catch (error: any) {
      console.error('Error fetching transfer:', error);
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to fetch transfer details');
    }
  },

  // Get all transfer orders for the current user
  async getTransferOrders(params?: any): Promise<any> {
    // If reference is provided, use the public track endpoint
    if (params?.reference) {
      const response = await apiClient.get(`/transfers/track/${params.reference}`);
      return { data: [response.data.data], total: 1, totalPages: 1 };
    }

    const response = await apiClient.get('/transfers/my', { params });
    return response.data.data;
  },

  // Cancel transfer
  async cancelTransfer(id: string, reason: string): Promise<void> {
    await apiClient.post(`/transfers/${id}/cancel`, { reason });
  },

  // Get exchange rate
  async getExchangeRate(from: string, to: string, amount: number, direction?: string): Promise<any> {
    const response = await apiClient.get('/transfers/rate', {
      params: { from, to, amount, direction }
    });

    const data = response.data.data;
    return {
      rate: data.exchangeRate,
      convertedAmount: data.receiveAmount,
      fee: data.commission,
      totalAmount: data.totalAmount
    };
  },

  // Get payment info
  async getPaymentInfo(direction: string = 'RU_TO_RW'): Promise<any> {
    const response = await apiClient.get('/transfers/payment/info', {
      params: { direction }
    });
    return response.data.data;
  },

  // Get transfer statistics (mock for now)
  async getTransferStats(): Promise<TransferOrderStats> {
    // This would be replaced with actual API call when backend implements it
    return Promise.resolve({
      totalTransfers: 0,
      totalAmountRUB: 0,
      totalAmountRWF: 0,
      totalFees: 0,
      pendingTransfers: 0,
      completedTransfers: 0,
      failedTransfers: 0,
      averageProcessingTime: 120
    });
  },

  // Get supported mobile networks
  async getMobileNetworks(): Promise<Array<{ id: MobileNetwork; name: string }>> {
    return [
      { id: MobileNetwork.MTN, name: 'MTN Rwanda' },
      { id: MobileNetwork.AIRTEL, name: 'Airtel Rwanda' },
      { id: MobileNetwork.TIGO, name: 'Tigo Rwanda' },
    ];
  },

  // Get supported payment methods
  getPaymentMethods(): Promise<Array<{ id: PaymentMethod; name: string }>> {
    return Promise.resolve([
      { id: PaymentMethod.BANK_TRANSFER, name: 'Bank Transfer' },
      { id: PaymentMethod.CREDIT_CARD, name: 'Credit Card' },
      { id: PaymentMethod.MOBILE_MONEY, name: 'Mobile Money' },
    ]);
  },

  // Export enums for direct usage in components
  enums: {
    MobileNetwork,
    PaymentMethod,
    TransferStatus,
  },
};

export default transferService;