import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  roles?: string[];
  disabled?: boolean;
}

const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <Icons.dashboard className="h-4 w-4" />,
  },
  {
    title: 'Transfers',
    href: '/transfers',
    icon: <Icons.transfer className="h-4 w-4" />,
  },
  {
    title: 'Wallets',
    href: '/wallets',
    icon: <Icons.wallet className="h-4 w-4" />,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: <Icons.transactions className="h-4 w-4" />,
  },
  {
    title: 'Recipients',
    href: '/recipients',
    icon: <Icons.contacts className="h-4 w-4" />,
  },
];

export function MainNav() {
  const location = useLocation();
  const { user } = useAuth();
   

  
  // Filter nav items based on user role
  const filteredMainNav = mainNavItems.filter((item) => !item.roles || !user || item.roles.includes(user.role));

  if (!user) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
      {filteredMainNav.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            cn(
              'text-sm font-medium transition-colors hover:text-primary flex items-center',
              isActive ? 'text-primary' : 'text-muted-foreground',
              item.disabled && 'cursor-not-allowed opacity-80'
            )
          }
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          {item.title}
        </NavLink>
      ))}
    </nav>
  );
}
