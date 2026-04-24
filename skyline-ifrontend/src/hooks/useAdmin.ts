/**
 * Admin Hooks
 * Reusable React Query hooks for admin operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { adminService } from '@/services/admin.service';
import { toast } from 'sonner';

/**
 * Hook for fetching admin dashboard stats
 */
export function useAdminStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_STATS],
    queryFn: adminService.getDashboardStats,
    staleTime: 30000,
  });
}

/**
 * Hook for fetching admin transfers list
 */
export function useAdminTransfers(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_TRANSFERS, params],
    queryFn: () => adminService.getTransfers(params),
    staleTime: 30000,
  });
}

/**
 * Hook for fetching transfers awaiting approval
 */
export function useTransfersAwaitingApproval(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_TRANSFERS, 'awaiting-approval', params],
    queryFn: () => adminService.getTransfersAwaitingApproval(params),
    staleTime: 30000,
  });
}

/**
 * Hook for approving a transfer
 */
export function useApproveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transferId: string) => adminService.approveTransfer(transferId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_TRANSFERS] });
      const currency = data?.data?.payoutDetails?.currency || 'RWF';
      const network = data?.data?.payoutDetails?.network || 'MTN Rwanda';
      toast.success(`Transfer approved! Process ${network} payout manually.`, {
        description: `${data?.data?.payoutDetails?.recipientPhone} - ${data?.data?.payoutDetails?.amount?.toLocaleString()} ${currency}`,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve transfer');
    },
  });
}

/**
 * Hook for rejecting a transfer
 */
export function useRejectTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transferId, reason }: { transferId: string; reason: string }) =>
      adminService.rejectTransfer(transferId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_TRANSFERS] });
      toast.success('Transfer rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject transfer');
    },
  });
}
