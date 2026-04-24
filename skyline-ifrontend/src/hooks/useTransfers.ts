/**
 * Transfer Hooks
 * Reusable React Query hooks for transfer operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import transferService from '@/services/transfer.service';
import { toast } from 'sonner';

/**
 * Hook for fetching user transfers
 */
export function useTransfers(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: [QUERY_KEYS.TRANSFERS, params],
    queryFn: () => transferService.getTransferOrders(params),
    staleTime: 30000,
  });
}

/**
 * Hook for fetching a single transfer
 */
export function useTransfer(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.TRANSFER, id],
    queryFn: () => transferService.getTransferOrder(id!),
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Hook for getting fixed exchange rate (18.4)
 * Returns hardcoded rate instead of fetching from backend
 */
export function useExchangeRate(amount: number = 1000) {
  // Fixed rate: 18.4 RWF per RUB
  const FIXED_RATE = 18.4;

  return {
    data: {
      rate: FIXED_RATE,
      convertedAmount: Math.round(amount * FIXED_RATE),
      fee: 0,
      totalAmount: amount,
      lastUpdated: new Date().toISOString()
    },
    isLoading: false,
    error: null
  };
}

/**
 * Hook for creating a transfer
 */
export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferService.createTransferOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSFERS] });
      toast.success('Transfer created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transfer');
    },
  });
}

/**
 * Hook for canceling a transfer
 */
export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      transferService.cancelTransfer(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSFERS] });
      toast.success('Transfer cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel transfer');
    },
  });
}
