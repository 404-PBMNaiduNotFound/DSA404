// Server-side Firebase Admin SDK — bypasses Firestore Security Rules and can
// verify ID tokens / manage Auth users. Equivalent of the old
// src/integrations/supabase/client.server.ts `supabaseAdmin`.
//
// SECURITY: only import this from *.server.ts modules, TanStack server
// functions, or Cloud Functions — never ship it to the client bundle.

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

function sanitizeEnvVar(val?: string): string | undefined {
  if (!val) return undefined;
  let cleaned = val.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function sanitizePrivateKey(key?: string): string | undefined {
  const cleaned = sanitizeEnvVar(key);
  if (!cleaned) return undefined;
  return cleaned.replace(/\\n/g, "\n");
}

function createAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const rawProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const projectId = sanitizeEnvVar(rawProjectId);
  const clientEmail = sanitizeEnvVar(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = sanitizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      ...(!projectId ? ["FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID"] : []),
      ...(!clientEmail ? ["FIREBASE_CLIENT_EMAIL"] : []),
      ...(!privateKey ? ["FIREBASE_PRIVATE_KEY"] : []),
    ];
    const message = `Missing Firebase Admin service-account env var(s): ${missing.join(", ")}. See MIGRATION_NOTES.md.`;
    console.error(`[Firebase Admin] ${message}`);
    throw new Error(message);
  }

  console.info(`[Firebase Admin] Initializing Admin SDK for project: '${projectId}' (email: ${clientEmail.slice(0, 10)}...)`);
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

let _adminAuth: Auth | undefined;
let _adminDb: Firestore | undefined;

export async function getAdminAuth(): Promise<Auth> {
  if (!_adminAuth) {
    const { getAuth } = await import("firebase-admin/auth");
    _adminAuth = getAuth(createAdminApp());
  }
  return _adminAuth;
}

export function getAdminDb(): Firestore {
  if (!_adminDb) _adminDb = getFirestore(createAdminApp());
  return _adminDb;
}

/** Verifies a Firebase ID token and returns the decoded claims (throws if invalid/expired). */
export async function verifyIdToken(idToken: string) {
  const auth = await getAdminAuth();
  try {
    return await auth.verifyIdToken(idToken);
  } catch (err: any) {
    const projId =
      sanitizeEnvVar(process.env.FIREBASE_PROJECT_ID) ||
      sanitizeEnvVar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ||
      "unknown";
    console.warn(
      `[Firebase Admin] verifyIdToken failed for project '${projId}'. Code: ${
        err?.code || "unknown"
      }, Message: ${err?.message || String(err)}`
    );
    throw err;
  }
}

/**
 * Wipes every document under `users/{uid}` (all subcollections), used by the
 * "Delete my account & data" flow.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  const adminDb = getAdminDb();
  const subcollections = [
    "days",
    "meta",
    "revisionEvents",
    "settings",
    "achievements",
    "pushSubscriptions",
  ];
  for (const name of subcollections) {
    const snap = await adminDb.collection("users").doc(uid).collection(name).get();
    const batchSize = 400;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = adminDb.batch();
      snap.docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await adminDb.collection("users").doc(uid).delete().catch(() => {});
}
