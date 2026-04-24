import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";

const AdminDashboard = () => {
  // Fetch admin dashboard data using actual backend endpoints
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminService.getDashboardStats,
  });

  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ['admin-transfers'],
    queryFn: () => adminService.getTransfers({ limit: 10 }),
  });

  if (statsLoading || transfersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="font-bold mt-4">
        <h1 className="text-white text-xl mt-1">Manage and control transfers.</h1>
      </div>

      {/* Stats Cards - Using actual backend data */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <Card className="bg-surface-dark border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
                <p className="text-2xl font-bold text-white">{stats?.totalTransfers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-dark border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Volume (RUB)</p>
                <p className="text-2xl font-bold text-white">
                  {Number(stats?.totalVolumeRUB || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-dark border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-white">{stats?.completedTransfers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-dark border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-amber-400" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Transfers</p>
                <p className="text-2xl font-bold text-white">{stats?.pendingTransfers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers */}
      <Card className="bg-surface-dark border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-primary" />
              Recent Transfers
            </span>
            <Link to="/admin/transfers" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transfersData?.transfers?.slice(0, 5).map((transfer: any) => (
              <Link
                key={transfer.id}
                to={`/admin/transfers/${transfer.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {transfer.senderName} → {transfer.recipientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.recipientPhone} • {new Date(transfer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">
                      {transfer.sendAmount?.toLocaleString()} {transfer.fromCurrency?.code || transfer.sendCurrency || 'RUB'}
                    </p>
                    {getStatusBadge(transfer.status)}
                  </div>
                </div>
              </Link>
            ))}

            {(!transfersData?.transfers || transfersData.transfers.length === 0) && (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transfers found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;