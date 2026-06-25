import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  User,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Download,
  Copy,
  RefreshCw,
  FileText,
  Loader2,
  Settings,
  Play,
  ThumbsUp,
  ThumbsDown,
  Smartphone,
  ChevronRight
} from "lucide-react";

import transferService, { TransferOrderDto, TransferStatus } from "@/services/transfer.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { generateTransferReceipt } from "@/lib/receipt-generator";

const TransferDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [transfer, setTransfer] = useState<TransferOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const isAdmin = user?.role === 'ADMIN';
  const isAdminView = location.pathname.startsWith('/admin');

  const loadTransfer = async (showRefreshing = false) => {
    if (!id) {
      toast.error('Invalid transfer ID');
      navigate(isAdminView ? '/admin/transfers' : '/transfers');
      return;
    }

    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      let data;
      if (isAdminView && isAdmin) {
        const { adminService } = await import('@/services/admin.service');
        data = await adminService.getTransferById(id);
      } else {
        data = await transferService.getTransferOrder(id);
      }

      if (!data) {
        throw new Error('Transfer not found');
      }
      setTransfer(data);
    } catch (error: any) {
      console.error('Failed to load transfer:', error);
      const errorMessage = error.message || 'Failed to load transfer details';
      toast.error(errorMessage);
      if (errorMessage.includes('not found') || errorMessage.includes('Invalid')) {
        setTimeout(() => navigate(isAdminView ? '/admin/transfers' : '/transfers'), 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransfer();
  }, [id, isAdmin, isAdminView]);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'failed':
      case 'cancelled':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20">Unknown</Badge>;
    const variants = {
      completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      processing: "bg-primary/10 text-primary border-primary/20",
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      pending_payment: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      paid_awaiting_approval: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
      cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20"
    };

    return (
      <Badge variant="outline" className={cn("px-3 py-1 font-bold tracking-wider", variants[status.toLowerCase() as keyof typeof variants] || variants.pending)}>
        <Clock className="h-3.5 w-3.5 mr-2" />
        <span className="uppercase text-[10px]">{status.replace(/_/g, ' ')}</span>
      </Badge>
    );
  };

  const getProgressSteps = (status: string) => {
    const steps = [
      { key: 'pending', label: 'Order Created', description: 'Transfer request submitted', timestamp: transfer?.createdAt },
      { key: 'processing', label: 'Payment Verified', description: 'Payment confirmation received', timestamp: transfer?.paidAt },
      { key: 'processing', label: 'Processing', description: 'Sending money to recipient', timestamp: transfer?.processedAt },
      { key: 'completed', label: 'Completed', description: 'Money delivered successfully', timestamp: transfer?.completedAt }
    ];

    const currentStep = status?.toLowerCase() || 'pending';
    let activeIndex = 0;

    if (currentStep === 'pending') activeIndex = 0;
    else if (currentStep === 'pending_payment' || currentStep === 'paid_awaiting_approval') activeIndex = 1;
    else if (currentStep === 'processing') activeIndex = 2;
    else if (currentStep === 'completed') activeIndex = 3;

    return steps.map((step, index) => ({
      ...step,
      isActive: index <= activeIndex,
      isCurrent: index === activeIndex,
      isCompleted: index < activeIndex
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const safeNumber = (value: any, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  const approvePayment = async () => {
    if (!id || !isAdmin) return;
    setProcessing(true);
    try {
      const { adminService } = await import('@/services/admin.service');
      await adminService.approveTransfer(id);
      toast.success('Payment approved! Process payout manually.');
      await loadTransfer(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Approval failed');
    } finally {
      setProcessing(false);
    }
  };

  const rejectPayment = async () => {
    if (!id || !isAdmin || !rejectionReason.trim()) return;
    setProcessing(true);
    try {
      const { adminService } = await import('@/services/admin.service');
      await adminService.rejectTransfer(id, rejectionReason);
      toast.success('Payment rejected');
      setRejectDialog(false);
      await loadTransfer(true);
    } catch (error: any) {
      toast.error('Rejection failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!transfer) return <div className="text-center py-12"><h1 className="text-2xl font-bold text-white mb-4">Transfer Not Found</h1><Button asChild><Link to="/transfers">Back</Link></Button></div>;

  const isRuToRw = transfer.direction === 'RU_TO_RW';
  const sendCurrency = transfer.fromCurrency?.code || (transfer.direction === 'RU_TO_RW' ? 'RUB' : 'RWF');
  const receiveCurrency = transfer.toCurrency?.code || (transfer.direction === 'RU_TO_RW' ? 'RWF' : 'RUB');

  return (
    <div className="w-full pb-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Transfer Details</h1>
            <p className="text-muted-foreground">Reference: {transfer.reference}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isAdmin && isAdminView && (transfer.status === TransferStatus.PENDING_PAYMENT || transfer.status === TransferStatus.PAID_AWAITING_APPROVAL) && (
            <>
              <Button onClick={approvePayment} disabled={processing} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9">
                <ThumbsUp className="h-3.5 w-3.5 mr-2" />
                Approve Payment
              </Button>
              <Button onClick={() => setRejectDialog(true)} disabled={processing} size="sm" variant="destructive" className="font-bold h-9">
                <ThumbsDown className="h-3.5 w-3.5 mr-2" />
                Reject Payment
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="border-white/10 text-white bg-white/5 hover:bg-white/10 h-9"
            onClick={() => transfer && generateTransferReceipt(transfer)}
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Receipt
          </Button>
        </div>
      </div>

      {/* Transfer Status Card */}
      <Card className="bg-surface-dark border-white/5 mb-6 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg font-bold">Transfer Status</CardTitle>
            {getStatusBadge(transfer.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Column 1: Reference & Direction */}
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                   <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-1">Reference</p>
                  <div className="flex items-center gap-2">
                     <p className="font-bold text-white tracking-wide">{transfer.reference}</p>
                     <Copy className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => copyToClipboard(transfer.reference, 'Reference')} />
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                   <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-1">Created</p>
                   <p className="font-medium text-white text-sm">{formatDate(transfer.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Column 2: Amounts */}
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                 <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                    <Smartphone className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-1">Amount Sent</p>
                   <p className="text-xl font-black text-white">{safeNumber(transfer.sendAmount).toLocaleString()} <span className="text-xs text-muted-foreground uppercase">{sendCurrency}</span></p>
                 </div>
              </div>
              <div className="flex items-start space-x-3">
                 <div className="bg-emerald-500/10 p-2 rounded-lg mt-0.5">
                    <User className="h-5 w-5 text-emerald-500" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-1">Recipient Gets</p>
                    <p className="text-xl font-black text-emerald-400">{safeNumber(transfer.receiveAmount).toLocaleString()} <span className="text-xs opacity-70 uppercase">{receiveCurrency}</span></p>
                 </div>
              </div>
            </div>

            {/* Column 3: Rate & Fee */}
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                   <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-1">Exchange Rate</p>
                  <p className="font-bold text-white text-sm">1 {sendCurrency} = {safeNumber(transfer.exchangeRate).toFixed(2)} {receiveCurrency}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                   <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-1">Service Fee</p>
                   <p className="font-bold text-emerald-400 text-sm">0 {sendCurrency}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Progress */}
      <Card className="bg-surface-dark border-white/5 mb-6 shadow-xl">
        <CardHeader><CardTitle className="text-white text-lg font-bold">Transfer Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-0 before:w-0.5 before:bg-white/5">
            {getProgressSteps(transfer.status).map((step, index) => (
              <div key={index} className="flex items-start space-x-4 relative z-10">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                  step.isActive ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-surface-dark border-white/10 text-muted-foreground"
                )}>
                  {step.isCompleted ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={cn("font-bold tracking-tight text-sm", step.isActive ? "text-white" : "text-muted-foreground")}>{step.label}</p>
                    {step.timestamp && <p className="text-[10px] uppercase font-bold text-muted-foreground/60">{formatDate(step.timestamp)}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parties Info */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-surface-dark border-white/5 hover:border-primary/20 transition-all shadow-xl">
          <CardHeader className="pb-4"><CardTitle className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
             <User className="h-4 w-4 text-primary" /> Sender Information
          </CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Full Name</p><p className="font-bold text-white">{transfer.senderName}</p></div>
            <div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Phone Number</p><p className="font-bold text-white">{transfer.senderPhone || 'Not provided'}</p></div>
            <div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Location</p><p className="font-bold text-white">{isRuToRw ? 'Russia' : 'Rwanda'}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-surface-dark border-white/5 hover:border-primary/20 transition-all shadow-xl">
          <CardHeader className="pb-4"><CardTitle className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
             <User className="h-4 w-4 text-primary" /> Recipient Information
          </CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Full Name</p><p className="font-bold text-white">{transfer.recipientName}</p></div>
            <div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Mobile Money Number</p><p className="font-bold text-white">{transfer.recipientPhone}</p></div>
            <div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Network & Location</p><p className="font-bold text-white">{transfer.recipientNetwork} - {isRuToRw ? 'Rwanda' : 'Russia'}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Summary */}
      <Card className="bg-surface-dark border-white/5 mb-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <FileText className="h-24 w-24" />
        </div>
        <CardHeader className="pb-4 border-b border-white/5">
           <CardTitle className="text-white text-lg font-bold">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Amount to Send</span>
            <span className="text-white font-bold">{safeNumber(transfer.sendAmount).toLocaleString()} {sendCurrency}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Exchange Rate</span>
            <span className="text-white font-bold">1 {sendCurrency} = {safeNumber(transfer.exchangeRate).toFixed(2)} {receiveCurrency}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Service Fee</span>
            <span className="text-white font-bold uppercase text-xs text-emerald-400 font-black">0 {sendCurrency}</span>
          </div>
          <div className="h-px bg-white/5 my-2"></div>
          <div className="flex justify-between items-center">
            <span className="text-white font-black uppercase text-xs tracking-widest">Total Paid</span>
            <span className="text-white font-black text-2xl tracking-tighter">{safeNumber(transfer.sendAmount).toLocaleString()} <span className="text-xs uppercase opacity-60 font-medium">{sendCurrency}</span></span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">Recipient Receives</span>
            <span className="text-emerald-400 font-black text-2xl tracking-tighter">{safeNumber(transfer.receiveAmount).toLocaleString()} <span className="text-xs uppercase opacity-70 font-medium">{receiveCurrency}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="pt-4">
         <Button variant="outline" className="w-full h-14 border-white/5 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Transfers
         </Button>
      </div>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent className="bg-surface-dark border-white/10 shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="h-1.5 bg-destructive"></div>
          <DialogHeader className="p-8 pb-4">
             <DialogTitle className="text-white text-2xl font-black">Reject Payment</DialogTitle>
             <DialogDescription className="text-muted-foreground pt-1">Please provide a reason for rejecting this transaction.</DialogDescription>
          </DialogHeader>
          <div className="px-8 pb-8 space-y-4">
             <Input placeholder="e.g. Invalid screenshot, check not received..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="h-14 bg-background-dark border-white/10 text-white rounded-xl" />
          </div>
          <DialogFooter className="bg-white/5 p-6 flex gap-3">
            <Button variant="ghost" onClick={() => setRejectDialog(false)} className="text-white h-12 flex-1 rounded-xl font-bold">Cancel</Button>
            <Button variant="destructive" onClick={rejectPayment} disabled={processing || !rejectionReason.trim()} className="h-12 flex-1 rounded-xl font-bold">Reject Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransferDetailsPage;