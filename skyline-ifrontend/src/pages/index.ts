/**
 * Pages Index
 * Centralized page exports for routing
 */

// Public Pages
export { default as IndexPage } from './Index';
export { default as LoginPage } from './Login';
export { default as RegisterPage } from './Register';
export { default as NotFoundPage } from './NotFound';

// Protected Pages
export { default as DashboardPage } from './Dashboard';
export { default as ProfilePage } from './Profile';
export { default as SendMoneyPage } from './SendMoney';
export { default as TrackTransferPage } from './TrackTransfer';

// Transfer Pages
export { default as TransfersPage } from './transfers/TransfersPage';
export { default as NewTransferPage } from './transfers/NewTransferPage';
export { default as TransferDetailsPage } from './transfers/TransferDetailsPage';

// Admin Pages
export { default as AdminDashboard } from './admin/AdminDashboard';
export { default as AdminTransfers } from './admin/AdminTransfers';
export { default as AdminUsers } from './admin/AdminUsers';
export { default as AdminSettings } from './admin/AdminSettings';
