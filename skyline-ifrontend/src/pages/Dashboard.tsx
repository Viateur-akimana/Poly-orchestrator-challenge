import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Loader2,
  X,
  Bell,
  CreditCard,
  Users,
  Activity,
  Eye
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import transferService from "@/services/transfer.service";
import { toast } from "sonner";
import { Role } from "@/types/auth";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const { user } = useAuth();

  // Redirect admins to admin dashboard
  if (user?.role === Role.ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Fetch dashboard data with React Query
  const { data: transfersData, isLoading: transfersLoading, error: transfersError } = useQuery({
    queryKey: ['user-transfers'],
    queryFn: () => transferService.getTransferOrders({ limit: 5 }),
    retry: 1,
    staleTime: 30000
  });

  const { data: exchangeRate, isLoading: rateLoading } = useQuery({
    queryKey: ['exchange-rate'],
    queryFn: () => transferService.getExchangeRate('RUB', 'RWF', 1),
    retry: 1,
    staleTime: 60000
  });

  if (transfersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const transfers = transfersData?.transfers || [];

  // Calculate statistics with proper field handling
  const completedTransfersList = transfers.filter((t: any) => t.status === 'COMPLETED');
  const pendingTransfersList = transfers.filter((t: any) =>
    t.status === 'PENDING' ||
    t.status === 'PENDING_PAYMENT' ||
    t.status === 'PROCESSING' ||
    t.status === 'PAYMENT_VERIFIED'
  );

  const stats = {
    totalTransfers: transfers.length,
    completedTransfers: completedTransfersList.length,
    pendingTransfers: pendingTransfersList.length,
    // Sum all sendAmount from transfers - this represents total sent
    totalAmountRUB: transfers.reduce((sum: number, t: any) => {
      const amount = t.sendAmount ? parseFloat(String(t.sendAmount)) : 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0),
    // Sum completed transfers only for completed amount
    completedAmountRUB: completedTransfersList.reduce((sum: number, t: any) => {
      const amount = t.sendAmount ? parseFloat(String(t.sendAmount)) : 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0),
    // Sum all receiveAmount from completed transfers (total to be received in RWF)
    completedAmountRWF: completedTransfersList.reduce((sum: number, t: any) => {
      const amount = t.receiveAmount ? parseFloat(String(t.receiveAmount)) : 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0)
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'PENDING':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'FAILED':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'CANCELLED':
        return <X className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      COMPLETED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      PROCESSING: "bg-primary/20 text-primary border-primary/30",
      PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
      CANCELLED: "bg-slate-500/20 text-slate-400 border-slate-500/30"
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || variants.PENDING}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-8 mt-2">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white">
            Secure and reliable money transfers to Rwanda with Skyline.
          </h1>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Button variant="outline" asChild className="border-white/10 bg-white/10 text-white hover:bg-white/10 hover:text-white">
            <Link to="/transfers">
              <Eye className="h-4 w-4 mr-2" />
              View Transfers
            </Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-background-dark" asChild>
            <Link to="/send-money">
              <Plus className="h-4 w-4 mr-2" />
              Send Money
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-surface-dark border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold text-white">{Number(stats.totalAmountRUB).toLocaleString('en-US', { maximumFractionDigits: 2 })} RUB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-dark border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <ArrowUpRight className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
                <p className="text-2xl font-bold text-white">{stats.totalTransfers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-dark border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-white">{stats.completedTransfers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-dark border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Clock className="h-8 w-8 text-amber-400" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-white">{stats.pendingTransfers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="">
        {/* Recent Transfers */}
        <div className="">
          <Card className="bg-surface-dark border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-primary" />
                  Recent Transfers
                </span>
                <Link to="/transfers" className="text-sm text-primary hover:underline">
                  View All
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transfers.map((transfer: any) => (
                  <Link
                    key={transfer.id}
                    to={`/transfers/${transfer.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <ArrowUpRight className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            To {transfer.recipientName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transfer.recipientPhone} • {new Date(transfer.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium text-white">
                              -{transfer.sendAmount?.toLocaleString()} {transfer.fromCurrency?.code || transfer.sendCurrency || 'RUB'}
                            </p>
                            <p className="text-sm text-emerald-400">
                              +{transfer.receiveAmount?.toLocaleString()} {transfer.toCurrency?.code || transfer.receiveCurrency || 'RWF'}
                            </p>
                          </div>
                          {getStatusBadge(transfer.status)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {transfers.length === 0 && (
                <div className="text-center py-12">
                  <ArrowDownLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No transfers yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Start sending money to your family and friends in Rwanda
                  </p>
                  <Button className="bg-primary hover:bg-primary/90 text-background-dark" asChild>
                    <Link to="/send-money">
                      <Plus className="h-4 w-4 mr-2" />
                      Send Your First Transfer
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;