/**
 * Browser notification helpers.
 *
 * Two layers:
 *  1. LOCAL — plain Web Notifications API. Works whenever the user grants
 *     permission. Used by ReminderRunner when the tab is open.
 *  2. BACKGROUND & FOREGROUND FCM — FCM via firebase-messaging-sw.js.
 *     FCM foreground messages require an onMessage() listener in the main thread.
 */

import { getMessagingIfSupported } from "@/integrations/firebase/client";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { pushSubscriptionsCol } from "@/lib/db";

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator;

export type PushState = "unsupported" | "default" | "granted" | "denied";

export function pushState(): PushState {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as PushState;
}

// Module-level singleton state to prevent duplicate registrations and HMR/render loop churning
let lastSubscribedUserId: string | null = null;
let lastSubscribedTime = 0;
let isForegroundListenerRegistered = false;
let activeUnsubscribe: (() => void) | null = null;

/** Register the firebase messaging service worker (best-effort). */
export async function registerReminderWorker() {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.info("[push] Stage A: Service Worker registered successfully:", reg.scope);
    return reg;
  } catch (err) {
    console.error("[push] Stage A ERROR: Service Worker registration failed:", err);
    return null;
  }
}

/**
 * Request notification permission from the browser.
 * Returns the new permission state.
 */
export async function requestPushPermission(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const result = await Notification.requestPermission();
  console.info(`[push] Stage A: Permission requested, user response: ${result}`);
  return result as PushState;
}

/**
 * Attempt to subscribe this device to FCM push.
 * @param userId Firebase Auth User ID
 * @param force Force token generation even if recently subscribed in this session
 * @returns true if FCM subscription succeeded, false otherwise.
 */
export async function subscribeDevice(userId: string, force = false): Promise<boolean> {
  const perm = pushState();
  console.info(`[push] Stage A: Diagnostic check — Permission: ${perm}, SW supported: ${pushSupported()}`);

  if (perm !== "granted") {
    console.warn("[push] Stage A: Cannot subscribe device — Notification permission is not granted.");
    return false;
  }

  // Session guard: if already subscribed for this user recently, skip redundant token fetch & Firestore write
  const now = Date.now();
  if (!force && lastSubscribedUserId === userId && now - lastSubscribedTime < 5 * 60 * 1000) {
    console.info(`[push] FCM token subscription already active for user ${userId.slice(0, 8)}... (Skipping duplicate generation)`);
    return true;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) {
    console.warn("[push] Stage A: NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing from environment variables.");
    return false;
  }

  try {
    const reg = await registerReminderWorker();
    if (!reg) {
      console.warn("[push] Stage A: Service Worker registration returned null.");
      return false;
    }

    const messaging = await getMessagingIfSupported();
    if (!messaging) {
      console.warn("[push] Stage A: FCM Messaging is not supported in this browser environment.");
      return false;
    }

    console.info("[push] Stage A: Requesting FCM Token from Firebase Messaging...");
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: reg,
    });

    if (!token) {
      console.error("[push] Stage A ERROR: getToken() returned empty token string.");
      return false;
    }

    console.info(`[push] Stage A SUCCESS: Real FCM token obtained (${token.slice(0, 10)}...${token.slice(-6)})`);

    // Save token to Firestore so backend can reach it
    await setDoc(doc(pushSubscriptionsCol(userId), token), {
      token,
      createdAt: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    });

    console.info(`[push] Stage B SUCCESS: Saved token to users/${userId}/pushSubscriptions/${token.slice(0, 8)}...`);
    lastSubscribedUserId = userId;
    lastSubscribedTime = now;
    return true;
  } catch (e: any) {
    console.error("[push] Stage A/B ERROR: FCM subscription failed:", e?.message || e);
    return false;
  }
}

/**
 * Setup client-side foreground listener for incoming FCM messages when tab is OPEN.
 * Listens via onMessage(messaging, callback).
 * Uses a singleton guard to guarantee exactly ONE listener per active application session.
 */
export async function setupForegroundNotificationListener(
  onReceive?: (payload: any) => void
): Promise<() => void> {
  if (!pushSupported()) return () => {};

  if (isForegroundListenerRegistered && activeUnsubscribe) {
    console.info("[push] Stage D: FCM foreground onMessage() listener is ALREADY active. Skipping duplicate registration.");
    return activeUnsubscribe;
  }

  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return () => {};

    console.info("[push] Stage D: Registering FCM foreground onMessage() listener...");

    const unsubscribeFn = onMessage(messaging, (payload) => {
      console.info("[push] Stage D SUCCESS: FCM foreground message received:", payload);

      const title =
        payload.notification?.title || payload.data?.title || "DSA⁴⁰⁴ Alert";
      const body =
        payload.notification?.body || payload.data?.body || "You have a new notification.";
      const tag =
        payload.data?.tag || (payload.notification as any)?.tag || `dsa-reminder-${Date.now()}`;

      if (onReceive) {
        onReceive(payload);
      }

      console.info("[push] Stage E: Displaying foreground notification popup via showLocalReminder...");
      void showLocalReminder(title, body, tag);
    });

    isForegroundListenerRegistered = true;
    activeUnsubscribe = () => {
      console.info("[push] Teardown: Unsubscribing FCM foreground onMessage() listener.");
      try {
        unsubscribeFn();
      } catch (err) {
        /* silent */
      }
      isForegroundListenerRegistered = false;
      activeUnsubscribe = null;
    };

    return activeUnsubscribe;
  } catch (err) {
    console.error("[push] Stage D ERROR: Failed to attach onMessage() listener:", err);
    return () => {};
  }
}

/**
 * Show a browser notification.
 * Uses Service Worker showNotification if available (survives tab hidden),
 * falls back to plain new Notification().
 */
export async function showLocalReminder(title: string, body: string, customTag?: string) {
  if (!pushSupported()) return;
  if (Notification.permission !== "granted") return;

  const tag = customTag || `dsa-reminder-${Date.now()}`;

  // 1. Try Service Worker showNotification first (works across Desktop, Android, PWA)
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = (await registerReminderWorker()) || undefined;
    }
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body,
        icon: "/icon.png",
        badge: "/icon.png",
        tag,
      });
      console.info("[push] Stage E SUCCESS: Displayed notification via ServiceWorker showNotification");
      return;
    }
  } catch (e) {
    console.warn("[push] SW notification failed, falling back to window.Notification:", e);
  }

  // 2. Fallback to plain Notification API
  try {
    new Notification(title, { body, icon: "/icon.jpg", tag });
    console.info("[push] Stage E SUCCESS: Displayed notification via window.Notification");
  } catch (e) {
    console.warn("[push] Stage E ERROR: showLocalReminder failed entirely:", e);
  }
}

/** "19:00" → minutes since midnight */
export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
