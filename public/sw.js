// public/sw.js
// RRBM Fasting Prayers 2026 Service Worker (Offline Shell & Push Alerts)

const CACHE_NAME = 'rrbm-app-cache-v2026';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/home.png',
  '/icons/alert.png',
  '/icons/songs.png',
  '/icons/money_jar.png'
];

// Install Event: Cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-first with Cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip API & WebSocket requests from cache
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Push Notification Event (Background alerts received from server)
self.addEventListener('push', (event) => {
  let title = '🚨 RRBM VOLUNTEER ALERT';
  let body = 'Leader is calling — volunteers are requested to gather immediately.';
  let data = { url: '/?tab=alert', alertId: 'current' };

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      data = payload.data || data;
    } catch {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [500, 200, 500, 200, 800],
    data: data,
    tag: `rrbm-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'send_alert', title: '🚨 Send alert' },
      { action: 'coming', title: "✓ I'm coming" },
      { action: 'not_coming', title: "✕ I cant come" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click & Action Buttons Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const alertId = event.notification.data?.alertId || 'current';

  // Quick Action: I'm coming or I cant come
  if (action === 'coming' || action === 'not_coming') {
    event.waitUntil(
      (async () => {
        try {
          await fetch('/api/alerts/response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alertId,
              volunteerId: '260',
              volunteerName: 'Volunteer',
              responseType: action
            })
          });
        } catch (e) {
          console.warn('[SW] Quick response sync error:', e);
        }

        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({ type: 'NOTIFICATION_QUICK_RESPONSE', responseType: action });
        }
      })()
    );
    return;
  }

  // Action: Send alert or open live alert room
  const targetUrl = action === 'send_alert' ? '/?tab=alert&action=compose' : (event.notification.data?.url || '/?tab=alert');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE_TAB', tab: 'alert', action: action === 'send_alert' ? 'compose' : null });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Check for New Alerts and Chat while App is in Background
let lastCheckedAlertId = null;
let lastChatCount = 0;

async function checkBackgroundAlerts() {
  try {
    const res = await fetch('/api/alerts', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const current = data.activeAlert;
      if (current && current.status === 'active' && current.id !== lastCheckedAlertId) {
        lastCheckedAlertId = current.id;
        await self.registration.showNotification('🚨 RRBM VOLUNTEER ALERT', {
          body: current.message || 'Volunteers are requested to gather immediately.',
          icon: '/logo.png',
          badge: '/logo.png',
          vibrate: [500, 200, 500, 200, 800],
          tag: `rrbm-bg-alert-${current.id}`,
          requireInteraction: true,
          actions: [
            { action: 'send_alert', title: '🚨 Send alert' },
            { action: 'coming', title: "✓ I'm coming" },
            { action: 'not_coming', title: "✕ I cant come" }
          ],
          data: { url: '/?tab=alert', alertId: current.id }
        });
      }
    }
  } catch {}
}

// Background sync registration if supported
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-alerts') {
    event.waitUntil(checkBackgroundAlerts());
  }
});

// Periodic background polling fallback (every 25 seconds)
setInterval(() => {
  checkBackgroundAlerts();
}, 25000);
