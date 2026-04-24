/*
 * Service Worker for Push Notifications
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, data: customData } = data;

    const options = {
      body: body || 'New notification',
      icon: icon || '/logo-small.png',
      badge: badge || '/logo-small.png',
      data: customData,
      vibrate: [200, 100, 200, 100, 200],
      tag: 'transfer-order-alert',
      renotify: true,
      silent: false,
      actions: [
        {
          action: 'open',
          title: 'View Order'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title || 'SKYLINE Transfers', options)
    );
  } catch (error) {
    console.error('Error in push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
