import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminDb, verifyIdToken } from "@/integrations/firebase/admin.server";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Missing or invalid Bearer authorization token" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1]?.trim();
    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Empty bearer token" },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (err: any) {
      console.warn("[api/push/test] Token verification failed:", err?.message || err);
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Invalid ID token" },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    if (!uid) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "No UID found in ID token" },
        { status: 401 }
      );
    }

    const db = getAdminDb();
    const pushSnap = await db.collection(`users/${uid}/pushSubscriptions`).get();

    if (pushSnap.empty) {
      console.info(`[api/push/test] Stage B/C: No stored FCM tokens found for uid=${uid}`);
      return NextResponse.json({
        success: false,
        stage: "B",
        error: "NO_TOKENS_STORED",
        message: "No FCM tokens found in Firestore for this user. Ensure notification permission is granted in Settings.",
        tokensFound: 0,
      });
    }

    const tokens = pushSnap.docs.map((d) => (d.data().token as string) ?? d.id).filter(Boolean);
    if (tokens.length === 0) {
      return NextResponse.json({
        success: false,
        stage: "B",
        error: "NO_VALID_TOKENS",
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

    console.info(`[api/push/test] Sending FCM test to ${tokens.length} token(s) for uid=${uid}`);
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

    console.info(`[api/push/test] Result: successCount=${successCount}, failureCount=${failureCount}`);

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
        error: "INTERNAL_ERROR",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
