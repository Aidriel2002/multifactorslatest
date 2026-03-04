// public/sw-push.js
// This file is imported by the generated service worker
// It handles push notifications and notification clicks

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Notification', body: event.data.text(), url: '/' }
  }

  const { title, body, url, icon, badge } = data

  event.waitUntil(
    self.registration.showNotification(title || 'New Notification', {
      body: body || '',
      icon: icon || '/icon-192.png',
      badge: badge || '/icon-192.png',
      data: { url: url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      tag: 'app-notification'
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus()
          client.postMessage({ type: 'NAVIGATE', url: targetUrl })
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})