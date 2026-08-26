/* FCM background service worker for dsatracker background push notifications */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB4hcNj9lISsWG5s-F3JKNfBbM669SY4eI",
  authDomain: "dsatracker-67ece.firebaseapp.com",
  projectId: "dsatracker-67ece",
  storageBucket: "dsatracker-67ece.firebasestorage.app",
  messagingSenderId: "865216700488",
  appId: "1:865216700488:web:f7e7fd9b0c0ab5524ab87d",
});

const messaging = firebase.messaging();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// The backend now sends data-only FCM messages (no top-level `notification`
// key) specifically so this handler is guaranteed to run for every message,
// in every app state — foreground, backgrounded, and fully closed. If a
// `notification` key is ever added back on the sender side, the push
// service will auto-display it and this handler will NOT fire, so keep the
// two in sync.
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw] Background FCM message received:", payload);
  const data = payload.data ?? {};
  const title = data.title ?? "DSA Tracker";
  const body = data.body ?? "You still have problems left for today.";
  const tag = data.tag ?? ("dsa-reminder-" + Date.now());
  const url = data.link ?? "/today";

  self.registration.showNotification(title, {
    body,
    icon: "/icon.png",
    badge: "/icon.png",
    tag,
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/today";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(urlToOpen);
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    })()
  );
});