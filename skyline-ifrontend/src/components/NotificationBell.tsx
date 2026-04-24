import React, { useState } from 'react';
import { Bell, Check, CheckCheck, RefreshCcw, CreditCard, Info } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { SkylineNotification } from '@/types/notification';

type Tab = 'all' | 'unread' | 'read';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  // Track locally which notifications have just been clicked (for instant tick feedback)
  const [justRead, setJustRead] = useState<Set<string>>(new Set());

  // Filter strictly for NEW transfer-related alerts, excluding completed ones
  const transferNotifications = notifications.filter(n =>
    n.type === 'ADMIN_ALERT' ||
    n.title.toLowerCase().includes('new transfer order')
  );

  const isRead = (n: SkylineNotification) => !!n.readAt || justRead.has(n.id);

  const unreadList = transferNotifications.filter(n => !isRead(n));
  const readList   = transferNotifications.filter(n => isRead(n));

  const displayed =
    activeTab === 'unread' ? unreadList :
    activeTab === 'read'   ? readList   :
    transferNotifications;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Instantly mark all as read locally for immediate UI feedback
    const unreadIds = unreadList.map(n => n.id);
    setJustRead(prev => new Set([...Array.from(prev), ...unreadIds]));
    
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification: SkylineNotification) => {
    // Instant visual feedback — show tick immediately
    setJustRead(prev => new Set(prev).add(notification.id));
    await markAsRead([notification.id]);

    if (notification.data?.reference) {
      if ((notification.type as string).includes('ADMIN')) {
        navigate('/admin/transfers');
      } else {
        navigate(`/transfers/${notification.data.reference}`);
      }
    }
  };

  const getIcon = (type: string, read: boolean) => {
    if (read) return <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />;
    const t = type.toUpperCase();
    if (t.includes('ADMIN') || t.includes('TRANSFER'))
      return <RefreshCcw className="h-3.5 w-3.5 text-primary" />;
    if (t.includes('PAYMENT'))
      return <CreditCard className="h-3.5 w-3.5 text-primary" />;
    return <Info className="h-3.5 w-3.5 text-primary" />;
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'all',    label: 'All',    count: transferNotifications.length },
    { id: 'unread', label: 'Unread', count: unreadList.length },
    { id: 'read',   label: 'Read' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-primary/10 group transition-all duration-300"
        >
          <Bell className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
          {unreadList.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <Badge
                className="relative inline-flex rounded-full h-4 w-4 p-0 items-center justify-center text-[8px] bg-primary text-primary-foreground border-2 border-background"
              >
                {unreadList.length > 9 ? '9+' : unreadList.length}
              </Badge>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[360px] p-0 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[#0c2f21] via-[#092218] to-[#071912] shadow-[0_15px_40px_rgba(54,226,123,0.15)] animate-in fade-in zoom-in-95 duration-200"
        align="end"
        sideOffset={8}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-base font-bold text-white tracking-wide">Notifications</span>
          <Button
            variant="link"
            className="text-xs text-primary-light font-semibold px-0 h-auto hover:text-white"
            onClick={() => navigate('/admin/notifications')}
          >
            VIEW ALL
          </Button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 px-4 pb-2 border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-primary shadow-sm text-primary-foreground'
                  : 'text-white/60 hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={[
                  'inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1 shadow-inner',
                  activeTab === tab.id
                    ? 'bg-white/25 text-white'
                    : 'bg-white/10 text-white/70',
                ].join(' ')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <ScrollArea className="h-[340px]">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-sm font-semibold text-white/90">
                {activeTab === 'unread' ? 'No unread notifications' :
                 activeTab === 'read'   ? 'No read notifications yet' :
                 'No transfer orders yet'}
              </p>
              <p className="text-xs text-white/50 mt-1">
                New orders will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="py-1">
              {displayed.map((notification) => {
                const read = isRead(notification);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={[
                      'w-full text-left flex items-start gap-3 px-4 py-3',
                      'border-l-[3px] transition-all duration-200 group',
                      'hover:bg-white/[0.04]',
                      read
                        ? 'border-transparent'
                        : 'border-primary bg-primary/10 shadow-inner',
                    ].join(' ')}
                  >
                    {/* Icon */}
                    <div className={[
                      'mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                      read
                        ? 'bg-primary/20 ring-1 ring-primary/40' // read: dark tint + green ring + green check
                        : 'bg-white shadow-xl', // unread: bright white circle + green icon
                    ].join(' ')}>
                      {getIcon(notification.type, read)}
                    </div>

                    {/* Text */}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className={[
                        'text-[13px] leading-snug truncate tracking-tight',
                        read ? 'font-medium text-white/50' : 'font-extrabold text-white',
                      ].join(' ')}>
                        {notification.title}
                      </span>
                      <span className={[
                        'text-[11px] leading-relaxed line-clamp-2',
                        read ? 'text-white/40' : 'text-white/80',
                      ].join(' ')}>
                        {notification.message}
                      </span>
                      <span className="text-[10px] text-primary/70 font-medium mt-0.5">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* ── Footer ── */}
        {unreadList.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/10 flex justify-end bg-black/20">
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] font-bold text-primary hover:text-white hover:bg-primary gap-1.5 h-8 px-3 rounded-full transition-all"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
