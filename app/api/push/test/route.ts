import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import {
  getAdminDb,
  verifyIdToken,
  getAdminProjectId,
  getClientProjectId,
  decodeJwtUnverified,
} from "@/integrations/firebase/admin.server";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[api/push/test] Case A: Authorization header missing or invalid format.");
      return NextResponse.json(
        {
          success: false,
          reason: "AUTH_HEADER_MISSING",
          message: "Missing or invalid Bearer authorization header",
        },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1]?.trim();
    if (!idToken) {
      console.warn("[api/push/test] Case B: Bearer token string is empty.");
      return NextResponse.json(
        {
          success: false,
          reason: "AUTH_HEADER_EMPTY",
          message: "Empty bearer token string",
        },
        { status: 401 }
      );
    }

    const adminProjectId = getAdminProjectId();
    const clientProjectId = getClientProjectId();
    const decodedUnverified = decodeJwtUnverified(idToken);

    console.info(`[api/push/test] Diagnostic Token Inspection:
      - adminProjectId: '${adminProjectId}'
      - clientProjectId: '${clientProjectId}'
      - tokenAudience (aud): '${decodedUnverified.aud || "unknown"}'
      - tokenIssuer (iss): '${decodedUnverified.iss || "unknown"}'
      - validFormat: ${decodedUnverified.validFormat}`
    );

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (err: any) {
      const errCode = err?.code || "auth/invalid-id-token";
      const tokenAud = decodedUnverified.aud;
      const projectMismatch = Boolean(tokenAud && adminProjectId && tokenAud !== adminProjectId);
      const finalErrorCode = projectMismatch ? "auth/id-token-project-id-mismatch" : errCode;

      console.warn(`[api/push/test] Case C: Firebase ID token verification failed. Code: ${finalErrorCode}, Details: ${err?.message || err}`);

      return NextResponse.json(
        {
          success: false,
          reason: "INVALID_FIREBASE_ID_TOKEN",
          errorCode: finalErrorCode,
          adminProjectId,
          clientProjectId,
          tokenAudience: tokenAud || "unknown",
          tokenIssuer: decodedUnverified.iss || "unknown",
          projectIdsMatch: !projectMismatch,
          details: err?.message || String(err),
          message: projectMismatch
            ? `Project ID mismatch! Token was issued for project '${tokenAud}', but Firebase Admin SDK is configured for '${adminProjectId}'.`
            : `Firebase Auth ID token verification failed (${finalErrorCode}).`,
        },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    if (!uid) {
      console.warn("[api/push/test] Case D: Decoded token contained no UID.");
      return NextResponse.json(
        {
          success: false,
          reason: "NO_UID_IN_TOKEN",
          message: "No UID found in verified ID token",
        },
        { status: 401 }
      );
    }

    console.info(`[api/push/test] Case E: Firebase Auth verified successfully for uid=${uid.slice(0, 8)}... Querying stored FCM tokens...`);

    const db = getAdminDb();
    const pushSnap = await db.collection(`users/${uid}/pushSubscriptions`).get();

    if (pushSnap.empty) {
      console.info(`[api/push/test] Stage B/C: No stored FCM tokens found in Firestore for uid=${uid}`);
      return NextResponse.json({
        success: false,
        stage: "B",
        reason: "NO_TOKENS_STORED",
        message: "No FCM tokens found in Firestore for this user. Ensure notification permission is granted in Settings.",
        tokensFound: 0,
      });
    }

    const tokens = pushSnap.docs.map((d) => (d.data().token as string) ?? d.id).filter(Boolean);
    if (tokens.length === 0) {
      return NextResponse.json({
        success: false,
        stage: "B",
        reason: "NO_VALID_TOKENS",
        message: "Push subscription documents existed but contained no valid token string.",
        tokensFound: 0,
      });
    }

    const testTag = `dsa-test-${Date.now()}`;
    const messagePayload = {
      tokens,
      notification: {
        title: "🚀 FCM Direct Push Test",
        body: "Direct FCM server-to-device push notification working successfully!",
      },
      data: {
        title: "🚀 FCM Direct Push Test",
        body: "Direct FCM server-to-device push notification working successfully!",
        tag: testTag,
        url: "/today",
        sentAt: new Date().toISOString(),
      },
      webpush: {
        fcmOptions: {
          link: "/today",
        },
      },
    };

    console.info(`[api/push/test] Sending FCM multicast test to ${tokens.length} token(s) for uid=${uid.slice(0, 8)}...`);
    const multicastResult = await getMessaging().sendEachForMulticast(messagePayload);

    let successCount = multicastResult.successCount;
    let failureCount = multicastResult.failureCount;
    const errors: string[] = [];

    // Safely prune dead/expired tokens
    await Promise.all(
      multicastResult.responses.map(async (resp, i) => {
        if (!resp.success) {
          const errCode = resp.error?.code || "unknown";
          errors.push(`Token ${i + 1} (${tokens[i].slice(0, 8)}...): ${errCode}`);
          if (
            errCode === "messaging/registration-token-not-registered" ||
            errCode === "messaging/invalid-registration-token"
          ) {
            console.info(`[api/push/test] Pruning invalid token doc for uid=${uid}`);
            await db.doc(`users/${uid}/pushSubscriptions/${tokens[i]}`).delete().catch(() => {});
          }
        }
      })
    );

    console.info(`[api/push/test] Multicast Result: successCount=${successCount}, failureCount=${failureCount}`);

    return NextResponse.json({
      success: successCount > 0,
      stage: successCount > 0 ? "C" : "C_FAILED",
      tokensFound: tokens.length,
      successCount,
      failureCount,
      errors,
      testTag,
      message:
        successCount > 0
          ? `FCM send succeeded for ${successCount}/${tokens.length} token(s).`
          : `FCM send failed for all tokens. See errors array for details.`,
    });
  } catch (err: any) {
    console.error("[api/push/test] Unexpected error:", err);
    return NextResponse.json(
      {
        success: false,
        stage: "C_ERROR",
        reason: "INTERNAL_ERROR",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
