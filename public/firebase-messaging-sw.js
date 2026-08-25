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

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw] Stage F: Background FCM message received:", payload);
  const title = payload.notification?.title ?? payload.data?.title ?? "DSA Tracker";
  const body =
    payload.notification?.body ?? payload.data?.body ?? "You still have problems left for today.";
  const tag = payload.data?.tag ?? payload.notification?.tag ?? ("dsa-reminder-" + Date.now());
  const url = payload.data?.url ?? payload.fcmOptions?.link ?? "/today";

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
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
