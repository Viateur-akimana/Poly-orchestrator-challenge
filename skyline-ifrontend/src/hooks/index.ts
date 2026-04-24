/**
 * Hooks Index
 * Central export point for all custom hooks
 */

// Transfer hooks
export {
  useTransfers,
  useTransfer,
  useExchangeRate,
  useCreateTransfer,
  useCancelTransfer,
} from './useTransfers';

// Admin hooks
export {
  useAdminStats,
  useAdminTransfers,
  useTransfersAwaitingApproval,
  useApproveTransfer,
  useRejectTransfer,
} from './useAdmin';
