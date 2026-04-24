import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Role } from "@/types/auth";

// Public Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// User Pages
import Dashboard from "./pages/Dashboard";
import SendMoney from "./pages/SendMoney";
import TrackTransfer from "./pages/TrackTransfer";
import HelpCenter from "./pages/HelpCenter";
import Profile from "./pages/Profile";
import TransfersPage from "./pages/transfers/TransfersPage";
import NewTransferPage from "./pages/transfers/NewTransferPage";
import TransferDetailsPage from "./pages/transfers/TransferDetailsPage";
import SelfServicePaymentPage from "./pages/transfers/SelfServicePaymentPage";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTransfers from "./pages/admin/AdminTransfers";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";

// Layouts
import DashboardLayout from "./components/layout/DashboardLayout";
import AdminLayout from "./components/layout/AdminLayout";
import WhatsAppButton from "./components/ui/WhatsAppButton";

// Dev Tools


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/help" element={<HelpCenter />} />

            {/* User Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute roles={[Role.USER]}>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/send-money" element={
              <ProtectedRoute roles={[Role.USER]}>
                <DashboardLayout>
                  <SendMoney />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/track" element={
              <ProtectedRoute roles={[Role.USER]}>
                <DashboardLayout>
                  <TrackTransfer />
                </DashboardLayout>
              </ProtectedRoute>
            } />


            <Route path="/transfers" element={
              <ProtectedRoute roles={[Role.USER]}>
                <DashboardLayout>
                  <TransfersPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/transfers/new" element={
              <ProtectedRoute roles={[Role.USER]}>
                <DashboardLayout>
                  <NewTransferPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/transfers/:id" element={
              <ProtectedRoute roles={[Role.USER]}>
                <DashboardLayout>
                  <TransferDetailsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/transfers/:transferId/self-service-payment" element={
              <ProtectedRoute roles={[Role.USER]}>
                <DashboardLayout>
                  <SelfServicePaymentPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/transfers/:transferId/payment" element={
              <ProtectedRoute roles={[Role.USER]}>
                <DashboardLayout>
                  <SelfServicePaymentPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />


            {/* Admin Protected Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute roles={[Role.ADMIN]}>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/transfers" element={
              <ProtectedRoute roles={[Role.ADMIN]}>
                <AdminLayout>
                  <AdminTransfers />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/transfers/:id" element={
              <ProtectedRoute roles={[Role.ADMIN]}>
                <AdminLayout>
                  <TransferDetailsPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/notifications" element={
              <ProtectedRoute roles={[Role.ADMIN]}>
                <AdminLayout>
                  <AdminNotifications />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute roles={[Role.ADMIN]}>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute roles={[Role.ADMIN]}>
                <AdminLayout>
                  <AdminSettings />
                </AdminLayout>
              </ProtectedRoute>
            } />


            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WhatsAppButton />
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
