import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  UserCheck,
  UserX,
  Shield,
  User,
  Eye,
  Calendar,
  Loader2,
  Users as UsersIcon
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService, UserManagement } from "@/services/admin.service";
import { toast } from "sonner";

const AdminUsers = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'status' | 'role' | null;
    user: UserManagement | null;
  }>({ open: false, type: null, user: null });

  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, statusFilter],
    queryFn: () => adminService.getUsers({
      page,
      limit: 20,
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      role: roleFilter === 'all' ? undefined : roleFilter,
    }),
  });

  const suspendUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.suspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User suspended successfully');
      setActionDialog({ open: false, type: null, user: null });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to suspend user');
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User activated successfully');
      setActionDialog({ open: false, type: null, user: null });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate user');
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: 'USER' | 'ADMIN' }) =>
      adminService.updateUserRole(data.userId, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated successfully');
      setActionDialog({ open: false, type: null, user: null });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user role');
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      suspended: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      blocked: "bg-red-500/20 text-red-400 border-red-500/30"
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || variants.active}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      ADMIN: "bg-primary/20 text-primary border-primary/30",
      USER: "bg-slate-500/20 text-slate-400 border-slate-500/30"
    };

    const icons = {
      ADMIN: Shield,
      USER: User
    };

    const Icon = icons[role as keyof typeof icons] || User;

    return (
      <Badge variant="outline" className={variants[role as keyof typeof variants] || variants.USER}>
        <Icon className="h-3 w-3 mr-1" />
        {role}
      </Badge>
    );
  };

  const handleStatusChange = (user: UserManagement) => {
    setActionDialog({ open: true, type: 'status', user });
  };

  const handleRoleChange = (user: UserManagement) => {
    setActionDialog({ open: true, type: 'role', user });
  };

  const handleSuspendUser = () => {
    if (!actionDialog.user) return;
    suspendUserMutation.mutate(actionDialog.user.id);
  };

  const handleActivateUser = () => {
    if (!actionDialog.user) return;
    activateUserMutation.mutate(actionDialog.user.id);
  };

  const confirmRoleChange = (newRole: 'USER' | 'ADMIN') => {
    if (!actionDialog.user) return;
    updateUserRoleMutation.mutate({
      userId: actionDialog.user.id,
      role: newRole
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>

          <p className="text-white font-bold text-lg mt-1">Manage user accounts and permissions</p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <UsersIcon className="h-4 w-4 mr-1" />
            {usersData?.meta?.total || 0} Total Users
          </Badge>
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
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-background-dark pl-10 text-white placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-12 rounded-xl border-white/10 bg-background-dark text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-surface-dark border-white/10">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 rounded-xl border-white/10 bg-background-dark text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-surface-dark border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
                setPage(1);
              }}
              className="h-12 rounded-xl border-white/10 bg-background-dark text-white hover:bg-white/10 hover:text-white"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-surface-dark border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            Users ({usersData?.meta?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transfers</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.data?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-muted-foreground">ID: {user.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.phoneNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.status)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-white">{user._count?.transferOrders || 0}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-white">-</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(user)}
                            className={user.status === 'active' ? 'text-amber-400 hover:text-amber-400/90' : 'text-emerald-400 hover:text-emerald-400/90'}
                          >
                            {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user)}
                            className="text-primary hover:text-primary/90"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {usersData?.data?.length === 0 && (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {usersData?.meta && usersData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, usersData.meta.total)} of {usersData.meta.total} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {usersData.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === usersData.meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={actionDialog.open && actionDialog.type === 'status'} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Status</DialogTitle>
            <DialogDescription>
              {actionDialog.user?.status === 'ACTIVE'
                ? `Suspend ${actionDialog.user?.firstName} ${actionDialog.user?.lastName}?`
                : `Activate ${actionDialog.user?.firstName} ${actionDialog.user?.lastName}?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Current Status: <span className="font-semibold">{actionDialog.user?.status}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleActivateUser}
                disabled={activateUserMutation.isPending || actionDialog.user?.status === 'ACTIVE'}
                className="bg-primary hover:bg-primary/90 text-background-dark"
              >
                {activateUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Activate
              </Button>
              <Button
                onClick={handleSuspendUser}
                disabled={suspendUserMutation.isPending || actionDialog.user?.status === 'SUSPENDED'}
                className="bg-warning hover:bg-warning/90 text-background-dark"
              >
                {suspendUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserX className="h-4 w-4 mr-2" />
                )}
                Suspend
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, user: null })}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={actionDialog.open && actionDialog.type === 'role'} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {actionDialog.user?.firstName} {actionDialog.user?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={actionDialog.user?.role === 'USER' ? 'default' : 'outline'}
                onClick={() => confirmRoleChange('USER')}
                disabled={updateUserRoleMutation.isPending}
                className={actionDialog.user?.role === 'USER' ? 'bg-primary hover:bg-primary/90 text-background-dark' : ''}
              >
                <User className="h-4 w-4 mr-2" />
                User
              </Button>
              <Button
                variant={actionDialog.user?.role === 'ADMIN' ? 'default' : 'outline'}
                onClick={() => confirmRoleChange('ADMIN')}
                disabled={updateUserRoleMutation.isPending}
                className={actionDialog.user?.role === 'ADMIN' ? 'bg-primary hover:bg-primary/90 text-background-dark' : ''}
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, user: null })}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;