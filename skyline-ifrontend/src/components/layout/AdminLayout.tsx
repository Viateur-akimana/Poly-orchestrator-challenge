import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { NotificationBell } from '../NotificationBell';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: CreditCard, label: 'Transfers', path: '/admin/transfers' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="lg:grid lg:grid-cols-6 gap-1 min-h-screen bg-background-light dark:bg-background-dark font-display">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile hamburger button */}
      <div className="lg:hidden fixed top-4 left-4 z-50 bg-white rounded-sm">
        <Button
          variant="ghost"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2"
        >
          {sidebarOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`bg-white/80 dark:bg-surface-dark fixed lg:static z-50 shadow-2xl lg:shadow-none min-h-screen max-h-screen overflow-hidden top-0 border-r border-black/5 dark:border-white/10 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } w-[280px] lg:w-auto lg:max-w-[40vw]`}>
        <div className="flex items-center justify-center px-6 border-b border-black/5 dark:border-white/10 h-24 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">currency_exchange</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground dark:text-white tracking-wider">
                SKYLINE
              </h1>

            </div>
          </div>
        </div>
        <div className="flex-1 mt-6 px-4 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between transition-all duration-200 px-4 py-3 rounded-xl mb-2 group 
        ${isActive
                    ? 'bg-primary text-white shadow-[0_8px_25px_rgba(54,226,123,0.25)]'
                    : 'hover:bg-white/10 text-white'
                  }`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex items-center gap-4">
                  <Icon className="h-5 w-5 text-white" /> {/* Always white */}
                  <span className="text-sm font-medium text-white"> {/* Always white */}
                    {item.label}
                  </span>
                </div>

                {/* Indicator pill */}
                <div className={`w-1 h-6 rounded-full transition-all 
        ${isActive ? 'bg-white' : 'bg-transparent group-hover:bg-white/30'}`}
                />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:col-span-5 w-full">
        {/* Top bar */}
        <header className="bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-black/5 dark:border-white/10 h-16 flex items-center px-6 lg:px-8">
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground dark:text-white">
                  {menuItems.find(item => item.path === location.pathname)?.label || 'Admin Dashboard'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <NotificationBell />
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-all duration-200"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-primary/30">
                    <AvatarFallback className="bg-primary text-white font-semibold text-xs">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {/* Dropdown menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-black/5 dark:border-white/10 py-2 z-50">
                    <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                          <AvatarFallback className="bg-primary text-white font-semibold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>

                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleLogout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-primary bg-primary/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4 inline mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="col-span-5 py-3 h-[92vh] overflow-y-auto px-6 lg:px-8 bg-background-light dark:bg-background-dark">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;