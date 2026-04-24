import apiClient from '@/lib/apiClient';
import { 
  Notification, 
  NotificationFilters, 
  NotificationListResponse, 
  NotificationPreference, 
  NotificationPreferenceUpdate
} from '@/types/notification';

export const notificationService = {
  // Get notifications with filters
  async getNotifications(filters?: NotificationFilters): Promise<NotificationListResponse> {
    const response = await apiClient.get('/notifications', { params: filters });
    return response.data;
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.data.count;
  },

  // Mark notification as read
  async markAsRead(id: string | string[]): Promise<void> {
    if (Array.isArray(id)) {
      await apiClient.patch('/notifications/mark-read', { ids: id });
    } else {
      await apiClient.patch(`/notifications/${id}/read`);
    }
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/mark-all-read');
  },

  // Delete notification
  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    await apiClient.delete('/notifications');
  },

  // Create notification (admin only)
  async createNotification(data: {
    title: string;
    message: string;
    type: string;
    userId?: string;
    broadcast?: boolean;
    metadata?: any;
  }): Promise<Notification> {
    const response = await apiClient.post('/notifications', data);
    return response.data.data;
  },

  // Get notification preferences
  async getPreferences(): Promise<NotificationPreference> {
    const response = await apiClient.get('/notifications/preferences');
    return response.data.data;
  },

  // Update notification preferences
  async updatePreferences(preferences: NotificationPreferenceUpdate): Promise<NotificationPreference> {
    const response = await apiClient.patch('/notifications/preferences', preferences);
    return response.data.data;
  },

  // Subscribe to real-time notifications (WebSocket placeholder)
  subscribeToNotifications(callback: (notification: Notification) => void): () => void {
    const interval = setInterval(async () => {
      try {
        // This is a placeholder for real WebSocket
      } catch (error) {
        console.error('Failed to check for new notifications:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  },

  // Push notification methods
  async subscribeToPushNotifications(subscription: PushSubscription): Promise<void> {
    await apiClient.post('/notifications/push/subscribe', subscription);
  },

  async unsubscribeFromPushNotifications(): Promise<void> {
    await apiClient.post('/notifications/push/unsubscribe');
  }
};

export default notificationService;