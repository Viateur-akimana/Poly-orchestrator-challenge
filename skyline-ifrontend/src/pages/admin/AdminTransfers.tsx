import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2,
  CreditCard,
  FileText,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AdminTransfers = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const queryClient = useQueryClient();

  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['admin-transfers', page, search, statusFilter, dateFrom, dateTo],
    queryFn: () => adminService.getTransfers({
      page,
      limit: 20,
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  });

  const approvePaymentMutation = useMutation({
    mutationFn: (transferId: string) => adminService.approveTransfer(transferId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-transfers'] });
      const currency = data?.data?.payoutDetails?.currency || 'RWF';
      const network = data?.data?.payoutDetails?.network || 'MTN Rwanda';
      toast.success(`Payment approved! Process ${network} payout manually.`, {
        description: `${data?.data?.payoutDetails?.recipientPhone} - ${data?.data?.payoutDetails?.amount?.toLocaleString()} ${currency}`
      });
      setVerificationDialog(false);
      setSelectedTransfer(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to approve payment');
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: ({ transferId, reason }: { transferId: string; reason: string }) =>
      adminService.rejectTransfer(transferId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transfers'] });
      toast.success('Payment rejected');
      setVerificationDialog(false);
      setSelectedTransfer(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reject payment');
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      COMPLETED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      PROCESSING: "bg-primary/20 text-primary border-primary/30",
      PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      PENDING_PAYMENT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      PAID_AWAITING_APPROVAL: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      PENDING_VERIFICATION: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      PAYMENT_VERIFIED: "bg-primary/20 text-primary border-primary/30",
      FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
      CANCELLED: "bg-slate-500/20 text-slate-400 border-slate-500/30"
    };

    const icons: Record<string, any> = {
      COMPLETED: CheckCircle,
      PROCESSING: Clock,
      PENDING: AlertTriangle,
      PENDING_PAYMENT: Clock,
      PAID_AWAITING_APPROVAL: FileText,
      PENDING_VERIFICATION: FileText,
      PAYMENT_VERIFIED: CheckCircle,
      FAILED: XCircle,
      CANCELLED: XCircle
    };

    const statusLabels: Record<string, string> = {
      PENDING_PAYMENT: "Awaiting Payment",
      PAID_AWAITING_APPROVAL: "Paid - Awaiting Approval"
    };

    const Icon = icons[status] || Clock;
    const label = statusLabels[status] || status.replace(/_/g, ' ');

    return (
      <Badge variant="outline" className={variants[status] || variants.PENDING}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const handleVerification = (transfer: any) => {
    setSelectedTransfer(transfer);
    setVerificationDialog(true);
  };

  const approvePayment = () => {
    if (selectedTransfer) {
      approvePaymentMutation.mutate(selectedTransfer.id);
    }
  };

  const rejectPayment = () => {
    if (selectedTransfer && rejectionReason.trim()) {
      rejectPaymentMutation.mutate({ transferId: selectedTransfer.id, reason: rejectionReason });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white">
            Transfer Management
          </h1>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-surface-dark border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Filter className="h-5 w-5 mr-2 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
              <Input
                placeholder="Search transfers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-background-dark pl-10 text-white placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 rounded-xl border-white/10 bg-background-dark text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-surface-dark border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
              <Input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-background-dark pl-10 text-white focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
              <Input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-background-dark pl-10 text-white focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
              className="h-12 rounded-xl border-white/10 bg-background-dark text-white hover:bg-white/10 hover:text-white"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <Card className="bg-surface-dark border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <CreditCard className="h-5 w-5 mr-2 text-primary" />
            Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transfersData?.transfers?.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No transfers found
              </h3>
              <p className="text-muted-foreground">
                No transfers match your current filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transfersData?.transfers?.map((transfer: any) => (
                <div
                  key={transfer.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors gap-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {transfer.reference || transfer.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.senderName} → {transfer.recipientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transfer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <p className="font-medium text-white">
                        {transfer.sendAmount?.toLocaleString()} {transfer.fromCurrency?.code || transfer.sendCurrency || 'RUB'}
                      </p>
                      <p className="text-sm text-emerald-400">
                        {transfer.receiveAmount?.toLocaleString()} {transfer.toCurrency?.code || transfer.receiveCurrency || 'RWF'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(transfer.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/admin/transfers/${transfer.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {transfer.status === 'PAID_AWAITING_APPROVAL' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerification(transfer)}
                          className="text-primary border-primary/30 hover:bg-primary/10"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Review & Approve</span>
                          <span className="sm:hidden">Review</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {transfersData?.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground order-first sm:order-none">
                Page {page} of {transfersData.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= transfersData.totalPages}
                className="w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Verification Dialog */}
      <Dialog open={verificationDialog} onOpenChange={setVerificationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review & Approve Transfer</DialogTitle>
            <DialogDescription>
              {selectedTransfer?.direction === 'RW_TO_RU'
                ? 'MTN MoMo payment received. Review and approve to mark as completed.'
                : 'Sberbank payment received. Review and approve to mark as completed.'}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              {/* Transfer Details */}
              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-mono font-bold">{selectedTransfer.reference || selectedTransfer.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sender:</span>
                  <span className="font-medium">{selectedTransfer.senderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-bold text-primary">{selectedTransfer.sendAmount?.toLocaleString()} {selectedTransfer.fromCurrency?.code || selectedTransfer.sendCurrency || 'RUB'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid At:</span>
                  <span>{selectedTransfer.paidAt ? new Date(selectedTransfer.paidAt).toLocaleString() : 'N/A'}</span>
                </div>
              </div>

              {/* Payout Details */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <h4 className="font-semibold text-foreground mb-2">
                  {selectedTransfer.direction === 'RW_TO_RU'
                    ? 'Russia Payout (Manual)'
                    : selectedTransfer.deliveryMethod === 'bank_account'
                      ? 'Rwanda Bank Payout (Manual)'
                      : 'Rwanda MTN Payout (Manual)'}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipient:</span>
                    <span className="font-medium">{selectedTransfer.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {selectedTransfer.direction === 'RW_TO_RU'
                        ? 'Card / Account:'
                        : selectedTransfer.deliveryMethod === 'bank_account' ? 'Bank / Account:' : 'Phone:'}
                    </span>
                    <span className="font-mono font-bold">
                      {selectedTransfer.deliveryMethod === 'bank_account'
                        ? `${selectedTransfer.notes?.split('Bank: ')[1] || 'Bank'} - ${selectedTransfer.recipientPhone}`
                        : selectedTransfer.recipientPhone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount to Send:</span>
                    <span className="font-bold text-primary">
                      {selectedTransfer.receiveAmount?.toLocaleString()} {selectedTransfer.toCurrency?.code || selectedTransfer.receiveCurrency || 'RWF'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Process this {selectedTransfer.direction === 'RW_TO_RU' ? 'RUB card' : selectedTransfer.deliveryMethod === 'bank_account' ? 'Bank' : 'MTN MoMo'} payout manually after approving
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={approvePayment}
                  disabled={approvePaymentMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-background-dark"
                >
                  {approvePaymentMutation.isPending ? (
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  ) : (
                    <ThumbsUp className="-ml-1 mr-2 h-4 w-4" />
                  )}
                  Approve & Complete
                </Button>

                <Button
                  variant="destructive"
                  onClick={rejectPayment}
                  disabled={rejectPaymentMutation.isPending || !rejectionReason.trim()}
                  className="flex-1"
                >
                  {rejectPaymentMutation.isPending ? (
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  ) : (
                    <ThumbsDown className="-ml-1 mr-2 h-4 w-4" />
                  )}
                  Reject
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium">Rejection Reason (required if rejecting):</label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setVerificationDialog(false);
              setRejectionReason("");
            }}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminTransfers;