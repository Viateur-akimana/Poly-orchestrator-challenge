import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { SkylineNotification } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, RefreshCcw, CreditCard, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AdminNotifications: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [justRead, setJustRead] = React.useState<Set<string>>(new Set());

  const handleNotificationClick = async (notification: SkylineNotification) => {
    if (!notification.readAt && !justRead.has(notification.id)) {
      setJustRead(prev => new Set(prev).add(notification.id));
      await markAsRead([notification.id]);
    }
    if (notification.data?.reference) {
      navigate(`/admin/transfers/${notification.data.reference}`);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.readAt && !justRead.has(n.id)).map(n => n.id);
    setJustRead(prev => new Set([...Array.from(prev), ...unreadIds]));
    await markAllAsRead();
  };

  const getIcon = (type: string, read: boolean) => {
    if (read) return <Check className="h-4 w-4 text-primary" strokeWidth={3} />;
    const t = type.toUpperCase();
    if (t.includes('ADMIN') || t.includes('TRANSFER'))
      return <RefreshCcw className="h-4 w-4 text-primary" />;
    return <Info className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete history of system alerts and transfer orders</p>
        </div>
        <Button onClick={handleMarkAllRead} className="bg-primary hover:bg-primary-dark">
          <CheckCheck className="w-4 h-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      <div className="bg-white dark:bg-surface-dark border border-border shadow-sm rounded-xl overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-semibold text-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const read = !!notification.readAt || justRead.has(notification.id);
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={[
                    'w-full text-left flex items-start gap-4 p-5 transition-all duration-200 hover:bg-muted/30 focus:bg-muted/50',
                    read ? 'opacity-70' : 'bg-primary/[0.02]',
                  ].join(' ')}
                >
                  <div className={[
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 border mt-1',
                    read ? 'bg-muted border-border' : 'bg-primary/10 border-primary/30',
                  ].join(' ')}>
                    {getIcon(notification.type, read)}
                  </div>
                  
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={[
                        'text-sm',
                        read ? 'font-medium text-foreground' : 'font-bold text-primary-dark dark:text-primary-light',
                      ].join(' ')}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
