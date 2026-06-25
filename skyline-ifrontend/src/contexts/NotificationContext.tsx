import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Role } from '@/types/auth';
import { notificationService } from '@/services/notification.service';
import { SkylineNotification, NotificationPreference } from '@/types/notification';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

interface NotificationContextType {
  notifications: SkylineNotification[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  preferences: NotificationPreference | null;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreference>) => Promise<void>;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Audio ref for notification sound
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<SkylineNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationService.getNotifications({
        limit: 50,
      });
      // Handle response.data which is the array of notifications according to backend
      return (response as any).data || [];
    },
    // Only poll for admins — regular users don't need transfer order alerts
    enabled: isAuthenticated && isAdmin,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Fetch notification preferences (admins only)
  const { data: preferences } = useQuery<NotificationPreference>({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      return await notificationService.getPreferences();
    },
    enabled: isAuthenticated && isAdmin,
  });

  // Request desktop notification permission — admins only
  useEffect(() => {
    if (isAuthenticated && isAdmin && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isAuthenticated, isAdmin]);

  // Update unread count when notifications change — alerts only for ADMIN
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const newUnreadCount = notifications.filter((n) => !n.read).length;
      
      // If unread count increased and user is ADMIN, fire alerts
      if (newUnreadCount > unreadCount && isAdmin) {
        const latestNotif = notifications[0];
        
        // Filter to strictly trigger ONLY for NEW transfer orders, NOT completed ones
        const isTransferOrder = 
          latestNotif.type === 'ADMIN_ALERT' ||
          latestNotif.title.toLowerCase().includes('new transfer order');

        if (isTransferOrder) {
          // 1. Play sound
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Sound playback failed', e));
          }

          // 2. Show in-app Toast
          toast({
            title: latestNotif.title,
            description: latestNotif.message,
            variant: "default",
            duration: 8000,
          });

          // 3. Show Native Desktop Notification
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              const nativeNotif = new Notification(latestNotif.title, {
                body: latestNotif.message,
                icon: '/logo-small.png', 
                badge: '/logo-small.png',
                tag: latestNotif.id,
              });

              nativeNotif.onclick = () => {
                window.focus();
                const path = (latestNotif.type as string).includes('ADMIN') ? '/admin/transfers' : '/transfers';
                navigate(path);
              };
            } catch (err) {
              console.error('Error showing native notification:', err);
            }
          }
        }
      }

      setUnreadCount(newUnreadCount);
      
      // Update document title with unread count
      if (newUnreadCount > 0) {
        document.title = `(${newUnreadCount}) Skyline Transfers`;
      } else {
        document.title = 'Skyline Transfers';
      }
    }
  }, [notifications, unreadCount, toast, navigate]);

  // Mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: (ids: string[]) => notificationService.markAsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'All notifications marked as read',
        variant: 'default',
      });
    },
  });

  // Delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Notification deleted',
        variant: 'default',
      });
    },
  });

  // Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: () => notificationService.clearAllNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'All notifications cleared',
        variant: 'default',
      });
    },
  });

  // Update notification preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (prefs: any) => notificationService.updatePreferences(prefs),
    onSuccess: (data: any) => {
      queryClient.setQueryData(['notificationPreferences'], data);
      toast({
        title: 'Notification preferences updated',
        variant: 'default',
      });
    },
  });

  // Wrapper functions
  const markAsRead = useCallback(
    async (ids: string[]) => {
      await markAsReadMutation.mutateAsync(ids);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback(
    async (id: string) => {
      await deleteNotificationMutation.mutateAsync(id);
    },
    [deleteNotificationMutation]
  );

  const clearAll = useCallback(async () => {
    await clearAllMutation.mutateAsync();
  }, [clearAllMutation]);

  const updatePreferences = useCallback(
    async (prefs: any) => {
      await updatePreferencesMutation.mutateAsync(prefs);
    },
    [updatePreferencesMutation]
  );

  useEffect(() => {
    if (isAuthenticated && (preferences as any)?.push) {
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const setupPushNotifications = async () => {
        try {
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            
            if (!vapidPublicKey) {
              console.warn('VAPID public key not found in environment');
              return;
            }

            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
            await (notificationService as any).subscribeToPushNotifications(subscription);
          }
        } catch (error) {
          console.error('Error setting up push notifications:', error);
        }
      };

      setupPushNotifications();

      return () => {
        if ('serviceWorker' in navigator) {
          (notificationService as any).unsubscribeFromPushNotifications?.().catch(console.error);
        }
      };
    }
  }, [isAuthenticated, (preferences as any)?.push]);

  const value = {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    isError,
    preferences: (preferences as any) || null,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updatePreferences,
    refresh: refetch,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
