import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Filter,
  Calendar,
  Eye,
  Download,
  Plus,
  ArrowUpRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  FileText,
  CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { transferService } from "@/services/transfer.service";
import { toast } from "sonner";
import { generateTransferReceipt } from "@/lib/receipt-generator";

const TransfersPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['user-transfers', page, search, statusFilter, dateFrom, dateTo],
    queryFn: () => {
      // Map simplified status to actual statuses for API
      let apiStatus: string | undefined;
      if (statusFilter === 'pending') {
        apiStatus = 'PENDING_PAYMENT';
      } else if (statusFilter === 'completed') {
        apiStatus = 'COMPLETED';
      }

      return transferService.getTransferOrders({
        page,
        limit: 20,
        search: search || undefined,
        status: apiStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      COMPLETED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      PROCESSING: "bg-primary/20 text-primary border-primary/30",
      PENDING_PAYMENT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      PAYMENT_VERIFIED: "bg-primary/20 text-primary border-primary/30",
      FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
      CANCELLED: "bg-slate-500/20 text-slate-400 border-slate-500/30"
    };

    const icons = {
      COMPLETED: CheckCircle,
      PROCESSING: Clock,
      PENDING_PAYMENT: AlertTriangle,
      PAYMENT_VERIFIED: CheckCircle,
      FAILED: XCircle,
      CANCELLED: XCircle
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || variants.PENDING_PAYMENT}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const exportTransfers = async () => {
    try {
      // This would call an export API endpoint
      toast.success('Export started. You will receive an email when ready.');
    } catch (error) {
      toast.error('Export failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Transfer History
          </h1>
          <p className="text-muted-foreground mt-1">View and manage all your money transfers</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">

          <Button className="bg-brand hover:bg-brand/90" asChild>
            <Link to="/send-money">
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Link>
          </Button>
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
              <p className="text-muted-foreground mb-6">
                {search || statusFilter !== 'all' || dateFrom || dateTo
                  ? 'Try adjusting your filters or search terms'
                  : 'Start by sending your first transfer to Rwanda'}
              </p>
              <Button className="bg-brand hover:bg-brand/90" asChild>
                <Link to="/send-money">
                  <Plus className="h-4 w-4 mr-2" />
                  Send Your First Transfer
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {transfersData?.transfers?.map((transfer: any) => (
                <div
                  key={transfer.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors gap-4"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {transfer.reference || transfer.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.recipientName || 'Recipient'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transfer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <p className="font-medium text-white">
                        {Number(transfer.sendAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} {transfer.fromCurrency?.code || transfer.sendCurrency || 'RUB'}
                      </p>
                      <p className="text-sm text-emerald-400">
                        {Number(transfer.receiveAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} {transfer.toCurrency?.code || transfer.receiveCurrency || 'RWF'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(transfer.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/transfers/${transfer.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {transfer.status === 'COMPLETED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateTransferReceipt(transfer)}
                          className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          <Download className="h-4 w-4" />
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
    </div>
  );
};

export default TransfersPage;