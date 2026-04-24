// Notification types that match the backend enum
export type NotificationType = 
  | 'TRANSFER_CREATED'
  | 'TRANSFER_UPDATED'
  | 'TRANSFER_COMPLETED'
  | 'TRANSFER_FAILED'
  | 'TRANSFER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_SENT'
  | 'PAYMENT_PROOF_UPLOADED'
  | 'ACCOUNT_VERIFIED'
  | 'PASSWORD_RESET'
  | 'LOGIN_ALERT'
  | 'SECURITY_ALERT'
  | 'ADMIN_ALERT'
  | 'SYSTEM_MAINTENANCE';

// Notification channel types
export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

export interface NotificationFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  read?: boolean;
}

export interface SkylineNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
  read: boolean;
  channels: NotificationChannel[];
  scheduledAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  readAt?: string | null;
}

export interface NotificationPreference {
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  channels: NotificationChannel[];
  preferences: {
    [key in NotificationType]: boolean;
  };
  updatedAt: string;
}

export interface MarkAsReadPayload {
  ids: string[];
}

export interface NotificationStats {
  total: number;
  read: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

export interface NotificationListResponse {
  data: SkylineNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationPreferenceUpdate {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  inApp?: boolean;
  channels?: NotificationChannel[];
  preferences?: Partial<{
    [key in NotificationType]: boolean;
  }>;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
