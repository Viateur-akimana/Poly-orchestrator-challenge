/**
 * Data Transfer Objects (DTOs)
 * Centralized type definitions for API requests and responses
 */

// ============ Pagination ============

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ Auth DTOs ============

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface AuthResponseDTO {
  user: UserDTO;
  accessToken: string;
  refreshToken?: string;
}

export interface PasswordResetRequestDTO {
  email: string;
}

export interface PasswordResetDTO {
  token: string;
  password: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// ============ User DTOs ============

export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserListDTO extends UserDTO {
  _count?: {
    transferOrders: number;
  };
}

export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface UpdateUserStatusDTO {
  reason?: string;
}

export interface UpdateUserRoleDTO {
  role: 'USER' | 'ADMIN';
}

// ============ Transfer DTOs ============

export interface CreateTransferDTO {
  recipientName: string;
  recipientPhone: string;
  sendAmount: number;
  sendCurrency?: 'RUB' | 'RWF';
  receiveCurrency?: 'RWF' | 'RUB';
  direction?: 'RU_TO_RW' | 'RW_TO_RU';
  notes?: string;
}

export interface TransferDTO {
  id: string;
  reference: string;
  userId: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientNetwork: string;
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fee: number;
  totalAmount: number;
  status: TransferStatus;
  paymentStatus: PaymentStatus;
  paymentMethodType: string;
  proofFile?: {
    url: string;
    type: string;
    uploadedAt: string;
  };
  proofVerification?: {
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
    rejectionReason?: string;
  };
  paidAt?: string;
  completedAt?: string;
  adminNotes?: string;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  fromCurrency?: CurrencyDTO;
  toCurrency?: CurrencyDTO;
  user?: Partial<UserDTO>;
}

export interface TransferListDTO {
  transfers: TransferDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CancelTransferDTO {
  reason: string;
}

export interface ApproveTransferDTO {
  adminNotes?: string;
}

export interface RejectTransferDTO {
  reason: string;
}

// ============ Exchange Rate DTOs ============

export interface ExchangeRateDTO {
  fromCurrency: string;
  toCurrency: string;
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  commission: number;
  totalAmount: number;
  processingTime: string;
  paymentMethod: string;
  supportedMethods: string[];
}

// ============ Payment DTOs ============

export interface PaymentInfoDTO {
  type: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  processingTime: string;
  paymentMethods: string[];
  manualInstructions?: {
    cardNumber?: string;
    cardHolder?: string;
    reference: string;
    steps: string[];
  };
}

export interface PaymentProofUploadDTO {
  transferId: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

export interface PaymentProofVerificationDTO {
  transferId: string;
  approved: boolean;
  notes?: string;
}

// ============ Statistics DTOs ============

export interface TransferStatisticsDTO {
  totalUsers: number;
  totalTransfers: number;
  totalVolumeRUB: number;
  totalVolumeRWF: number;
  pendingReviews: number;
  completedTransfers: number;
  failedTransfers: number;
  averageProcessingTime?: number;
}

export interface UserStatisticsDTO {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  regularUsers: number;
  newUsersToday: number;
  verifiedUsers: number;
  unverifiedUsers: number;
}

// ============ Currency DTOs ============

export interface CurrencyDTO {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

// ============ Notification DTOs ============

export interface NotificationDTO {
  id: string;
  userId: string;
  type: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

// ============ Enums ============

export type TransferStatus =
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'PAID_AWAITING_APPROVAL'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'PENDING_VERIFICATION'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'FAILED'
  | 'REJECTED'
  | 'REFUNDED';

// ============ API Response Wrappers ============

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
