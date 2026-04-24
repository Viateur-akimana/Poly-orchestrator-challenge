import apiClient from '@/lib/apiClient';

export interface AdminStats {
  totalUsers: number;
  totalTransfers: number;
  totalVolumeRUB: number;
  totalVolumeRWF: number;
  pendingReviews: number;
  pendingTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  averageProcessingTime: number;
}

export interface UserManagement {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
  totalTransfers: number;
  totalVolume: number;
}

export interface TransferAction {
  transferId: string;
  action: 'approve' | 'reject' | 'complete' | 'cancel';
  reason?: string;
  notes?: string;
}

export interface CardSettings {
  cardNumber: string;
  cardHolderName: string;
  rwandaMobileMoney?: string;
  rwandaRecipientName?: string;
  rwandaBankAccount?: string;
}

export const adminService = {
  // Get all transfers (admin only) - matches backend endpoint
  async getTransfers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<{
    transfers: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/transfers/admin/all', { params });
    return response.data.data;
  },

  // Get transfer by ID (admin)
  async getTransferById(id: string): Promise<any> {
    const response = await apiClient.get(`/transfers/${id}`);
    return response.data.data.transfer;
  },

  // Get transfer statistics (admin) - matches backend endpoint
  async getDashboardStats(): Promise<AdminStats> {
    const response = await apiClient.get('/transfers/admin/statistics');
    return response.data.data.statistics;
  },

  // User management endpoints
  async getUsers(params?: { page?: number; limit?: number; search?: string; status?: string; role?: string }): Promise<{
    data: UserManagement[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  async getUser(id: string): Promise<any> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  async getUserStats(): Promise<any> {
    const response = await apiClient.get('/users/stats');
    return response.data.data.stats;
  },

  async suspendUser(id: string, reason?: string): Promise<any> {
    const response = await apiClient.post(`/users/${id}/suspend`, { reason });
    return response.data;
  },

  async activateUser(id: string): Promise<any> {
    const response = await apiClient.post(`/users/${id}/activate`);
    return response.data;
  },

  async updateUserRole(id: string, role: 'USER' | 'ADMIN'): Promise<any> {
    const response = await apiClient.put(`/users/${id}/role`, { role });
    return response.data;
  },

  async updateTransferStatus(action: TransferAction): Promise<void> {
    // Mock implementation - would need backend endpoint
    throw new Error('Transfer status update not yet implemented in backend');
  },

  async approveTransfer(transferId: string, notes?: string): Promise<any> {
    const response = await apiClient.post(`/transfers/admin/${transferId}/approve-payment`, { adminNotes: notes });
    return response.data;
  },

  async rejectTransfer(transferId: string, reason: string): Promise<any> {
    const response = await apiClient.post(`/transfers/admin/${transferId}/reject-payment`, { reason });
    return response.data;
  },

  async getTransfersAwaitingApproval(params?: { page?: number; limit?: number }): Promise<any> {
    const response = await apiClient.get('/transfers/admin/awaiting-approval', { params });
    return response.data.data;
  },

  async getAnalytics(params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    transferVolume: Array<{ date: string; volume: number; count: number }>;
    statusDistribution: Array<{ status: string; count: number; percentage: number }>;
    topCountries: Array<{ country: string; count: number; volume: number }>;
    revenueData: Array<{ date: string; revenue: number; fees: number }>;
  }> {
    // Mock implementation
    return Promise.resolve({
      transferVolume: [],
      statusDistribution: [],
      topCountries: [],
      revenueData: []
    });
  },

  async getSettings(): Promise<{
    exchangeRates: { [key: string]: number };
    fees: { [key: string]: number };
    limits: { min: number; max: number; daily: number };
    maintenance: { enabled: boolean; message?: string };
  }> {
    // Mock implementation
    return Promise.resolve({
      exchangeRates: { 'RUB_RWF': 17.5 }, // Fixed rate
      fees: { fixed: 0, percentage: 0 },
      limits: { min: 100, max: 1000000, daily: 500000 },
      maintenance: { enabled: false }
    });
  },

  async updateSettings(settings: any): Promise<void> {
    // Mock implementation
    throw new Error('Settings management not yet implemented in backend');
  },

  async bulkUpdateTransfers(transferIds: string[], action: 'approve' | 'reject', reason?: string): Promise<void> {
    // Mock implementation
    throw new Error('Bulk operations not yet implemented in backend');
  },

  async exportTransfers(params?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Blob> {
    // Mock implementation
    throw new Error('Export functionality not yet implemented in backend');
  },

  async sendNotification(data: {
    userId?: string;
    type: 'email' | 'sms' | 'push';
    subject: string;
    message: string;
    broadcast?: boolean;
  }): Promise<void> {
    // Mock implementation
    throw new Error('Notification system not yet implemented in backend');
  },

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    logs: Array<{
      id: string;
      userId: string;
      action: string;
      resource: string;
      details: any;
      ipAddress: string;
      userAgent: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Mock implementation
    return Promise.resolve({
      logs: [],
      total: 0,
      page: 1,
      totalPages: 0
    });
  },

  // Card Settings endpoints
  async getCardSettings(): Promise<CardSettings> {
    const response = await apiClient.get('/system/card-settings');
    return response.data.data;
  },

  async updateCardSettings(settings: CardSettings): Promise<CardSettings> {
    const response = await apiClient.post('/system/card-settings', settings);
    return response.data.data;
  },

  async getExchangeRateSettings(): Promise<{ rubToRwf: number; rwfToRub: number; lastUpdated: string; source: string }> {
    const response = await apiClient.get('/system/exchange-rate-settings');
    return response.data.data;
  },

  async updateExchangeRate(rubToRwf: number, rwfToRub?: number): Promise<any> {
    const response = await apiClient.put('/system/exchange-rate-settings', { rubToRwf, rwfToRub });
    return response.data;
  },

  async createTransferForUser(data: {
    targetUserId: string;
    recipientName: string;
    recipientPhone: string;
    sendAmount: number;
    direction?: 'RU_TO_RW' | 'RW_TO_RU';
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.post('/transfers/admin/create', data);
    return response.data.data;
  }
};

export default adminService;