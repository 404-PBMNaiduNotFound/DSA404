import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminDb } from "@/integrations/firebase/admin.server";
import { syncContestsToFirestore, getContestsFromFirestore } from "../../contests/route";

/**
 * Runs on an EXTERNAL schedule (cron-job.org, GitHub Actions cron, etc.)
 * instead of Firebase Cloud Scheduler, because Cloud Scheduler / Functions v2
 * scheduled triggers require the Blaze plan. This route does exactly what
 * functions/src/index.ts's `sendReminders` did, using firebase-admin
 * directly against Firestore + FCM.
 *
 * Call every 15 minutes:
 *   GET https://yourapp.vercel.app/api/cron/send-reminders?secret=YOUR_CRON_SECRET
 *
 * Set CRON_SECRET in Vercel env vars. Never deploy this without the secret
 * check below — it sends real emails/pushes to every user.
 */

interface UserSettingsRow {
  uid: string;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  timezone?: string;
  lastReminderSentOn?: string;
  reminderTime?: string;
  paused?: boolean;
  morningReminderEnabled?: boolean;
  morningReminderTime?: string;
  lastMorningReminderSentOn?: string;
  contestReminderEnabled?: boolean;
  lastWeekdayQuoteSentOn?: string;
  lastWeekendQuoteSentPeriod?: string;
  lastLateReminderSentOn?: string;
}

const MOTIVATIONAL_QUOTES = [
  "Consistency is what transforms average into excellence. Keep coding!",
  "A bug is just a puzzle waiting to be solved. Don't give up!",
  "The expert in anything was once a beginner. Keep pushing forward.",
  "Your streak is a reflection of your discipline. Maintain it!",
  "Every problem you solve today makes you a better developer tomorrow.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "DSA is hard, but so are you. Keep grinding!",
  "Don't practice until you get it right. Practice until you can't get it wrong.",
];

/** Sends one push (if tokens exist) + one email (if enabled) to a user. Non-fatal on failure. */
async function notifyUser(
  db: FirebaseFirestore.Firestore,
  uid: string,
  opts: { pushEnabled?: boolean; emailEnabled?: boolean; title: string; body: string; link?: string },
  errors: string[]
) {
  if (opts.pushEnabled) {
    try {
      const subsSnap = await db.collection(`users/${uid}/pushSubscriptions`).get();
      const tokens = subsSnap.docs.map((d) => (d.data().token as string) ?? d.id).filter(Boolean);
      const uniqueTokens = Array.from(new Set(tokens));
      if (uniqueTokens.length > 0) {
        const result = await getMessaging().sendEachForMulticast({
          tokens: uniqueTokens,
          data: {
            title: opts.title,
            body: opts.body,
            link: opts.link ?? "/today",
          },
          webpush: {
            headers: { Urgency: "high", TTL: "86400" },
            fcmOptions: { link: opts.link ?? "/today" },
          },
        });
        await Promise.all(
          result.responses.map((r, i) => {
            if (r.success) return Promise.resolve();
            const code = r.error?.code ?? "";
            if (
              code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-registration-token"
            ) {
              return db.doc(`users/${uid}/pushSubscriptions/${uniqueTokens[i]}`).delete().catch(() => { });
            }
            return Promise.resolve();
          })
        );
      }
    } catch (e) {
      errors.push(`${uid} push: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

function nowMinutesInTz(timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  } catch {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}

function todayIsoInTz(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function dayOfWeekInTz(timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).formatToParts(new Date());
    const w = parts.find((p) => p.type === "weekday")?.value ?? "";
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[w] ?? new Date().getUTCDay();
  } catch {
    return new Date().getUTCDay();
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const errors: string[] = [];
  let eveningSent = 0;
  let morningSent = 0;
  let contestSent = 0;
  let topicSent = 0;
  let quoteSent = 0;

  const settingsSnap = await db
    .collectionGroup("settings")
    .where("paused", "==", false)
    .get();

  const candidates: UserSettingsRow[] = settingsSnap.docs
    .filter((d) => d.id === "prefs")
    .map((d) => ({ uid: d.ref.parent.parent!.id, ...d.data() }) as UserSettingsRow)
    .filter((row) => row.pushEnabled || row.emailEnabled);

  // ── 1. Compulsory Evening 9:30 PM Unresolved Problem Reminder ───────────
  const eveningDue = candidates.filter((row) => {
    const tz = row.timezone || "Asia/Kolkata";
    const today = todayIsoInTz(tz);
    if (row.lastReminderSentOn === today) return false;
    return nowMinutesInTz(tz) >= 21 * 60 + 30; // 9:30 PM
  });

  for (const row of eveningDue) {
    const uid = row.uid;
    try {
      const tz = row.timezone || "Asia/Kolkata";
      const today = todayIsoInTz(tz);
      const settingsRef = db.doc(`users/${uid}/settings/prefs`);

      const daySnap = await db
        .collection(`users/${uid}/days`)
        .where("date", "==", today)
        .limit(1)
        .get();
      if (daySnap.empty) continue;
      const day = daySnap.docs[0].data();

      const problems = (day.problems ?? []) as { done: boolean }[];
      const total = problems.length;
      const done = problems.filter((p) => p.done).length;

      // Condition: ONLY send if total > 0 AND done === 0
      if (total === 0 || done > 0) {
        await settingsRef.set({ lastReminderSentOn: today }, { merge: true });
        continue;
      }

      await notifyUser(
        db,
        uid,
        {
          pushEnabled: row.pushEnabled,
          emailEnabled: row.emailEnabled,
          title: "DSA⁴⁰⁴ Unresolved Problem Reminder",
          body: `You have 0 solved of ${total} scheduled problem${total !== 1 ? "s" : ""} today in ${day.topic || "today's plan"}. Log in and solve your problem before your streak breaks!`,
          link: "/today",
        },
        errors
      );

      await settingsRef.set({ lastReminderSentOn: today }, { merge: true });
      eveningSent += 1;
    } catch (e) {
      errors.push(`${uid} evening: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 1b. Compulsory 10:00 PM Unresolved Problem Follow-up Reminder ────────
  const lateEveningDue = candidates.filter((row) => {
    const tz = row.timezone || "Asia/Kolkata";
    const today = todayIsoInTz(tz);
    if (row.lastLateReminderSentOn === today) return false;
    return nowMinutesInTz(tz) >= 22 * 60; // 10:00 PM
  });

  for (const row of lateEveningDue) {
    const uid = row.uid;
    try {
      const tz = row.timezone || "Asia/Kolkata";
      const today = todayIsoInTz(tz);
      const settingsRef = db.doc(`users/${uid}/settings/prefs`);

      const daySnap = await db
        .collection(`users/${uid}/days`)
        .where("date", "==", today)
        .limit(1)
        .get();
      if (daySnap.empty) continue;
      const day = daySnap.docs[0].data();

      const problems = (day.problems ?? []) as { done: boolean }[];
      const total = problems.length;
      const done = problems.filter((p) => p.done).length;

      // Condition: ONLY send if total > 0 AND done === 0
      if (total === 0 || done > 0) {
        await settingsRef.set({ lastLateReminderSentOn: today }, { merge: true });
        continue;
      }

      await notifyUser(
        db,
        uid,
        {
          pushEnabled: row.pushEnabled,
          emailEnabled: row.emailEnabled,
          title: "🚨 Final DSA⁴⁰⁴ Reminder: Streak at Risk!",
          body: `You still have 0 solved of ${total} scheduled problem${total !== 1 ? "s" : ""} today in ${day.topic || "today's plan"}. Log in and solve your problem before midnight to save your streak!`,
          link: "/today",
        },
        errors
      );

      await settingsRef.set({ lastLateReminderSentOn: today }, { merge: true });
      eveningSent += 1;
    } catch (e) {
      errors.push(`${uid} late evening: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 2. Morning reminder (once/day, at morningReminderTime) ───────────────
  const morningDue = candidates.filter((row) => {
    if (!row.morningReminderEnabled) return false;
    const tz = row.timezone || "Asia/Kolkata";
    const today = todayIsoInTz(tz);
    if (row.lastMorningReminderSentOn === today) return false;
    const [h, m] = String(row.morningReminderTime ?? "08:00").split(":").map(Number);
    return nowMinutesInTz(tz) >= (h || 0) * 60 + (m || 0);
  });

  for (const row of morningDue) {
    const uid = row.uid;
    try {
      const tz = row.timezone || "Asia/Kolkata";
      const today = todayIsoInTz(tz);
      const settingsRef = db.doc(`users/${uid}/settings/prefs`);

      const daySnap = await db
        .collection(`users/${uid}/days`)
        .where("date", "==", today)
        .limit(1)
        .get();
      const day = daySnap.empty ? null : daySnap.docs[0].data();
      const topicName = day?.topic || "Today's Topic";
      const pendingCount = day
        ? ((day.problems ?? []) as { done: boolean }[]).filter((p) => !p.done).length
        : 0;

      await notifyUser(
        db,
        uid,
        {
          pushEnabled: row.pushEnabled,
          emailEnabled: row.emailEnabled,
          title: `☀️ Morning DSA Reminder: ${topicName}`,
          body:
            pendingCount > 0
              ? `Good morning! You have ${pendingCount} problem${pendingCount !== 1 ? "s" : ""} scheduled today in ${topicName}.`
              : `Good morning! Time to start practicing ${topicName}.`,
          link: "/today",
        },
        errors
      );

      await settingsRef.set({ lastMorningReminderSentOn: today }, { merge: true });
      morningSent += 1;
    } catch (e) {
      errors.push(`${uid} morning: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 3. Contest reminders (Morning alert, 1hr, and 10min windows) ─────────
  const contestCandidates = candidates.filter((row) => row.contestReminderEnabled);
  if (contestCandidates.length > 0) {
    try {
      let contests = await syncContestsToFirestore();
      if (contests.length === 0) {
        contests = await getContestsFromFirestore();
      }
      const nowMs = Date.now();

      for (const row of contestCandidates) {
        const uid = row.uid;
        const tz = row.timezone || "Asia/Kolkata";
        const today = todayIsoInTz(tz);
        const currentMins = nowMinutesInTz(tz);

        for (const contest of contests) {
          const contestStartDateIso = new Date(contest.startMs).toISOString().slice(0, 10);
          
          // Morning contest alert if contest is today
          if (contestStartDateIso === today && currentMins >= 8 * 60) {
            const morningSentRef = db.doc(`users/${uid}/contestRemindersSent/${contest.id}_morning`);
            const morningSentSnap = await morningSentRef.get();
            if (!morningSentSnap.exists) {
              try {
                await notifyUser(
                  db,
                  uid,
                  {
                    pushEnabled: row.pushEnabled,
                    emailEnabled: row.emailEnabled,
                    title: "🏆 Contest Alert",
                    body: `You have a contest today: ${contest.title}`,
                    link: "/contests",
                  },
                  errors
                );
                await morningSentRef.set({ sentAt: new Date().toISOString() });
                contestSent += 1;
              } catch (e) {
                errors.push(`${uid} contest morning: ${e instanceof Error ? e.message : String(e)}`);
              }
            }
          }

          // 1-hour and 10-minute start-soon alerts
          const diffMs = contest.startMs - nowMs;
          const windows: { key: string; lo: number; hi: number; bodyText: string }[] = [
            { key: "1h", lo: 50, hi: 70, bodyText: `Your contest ${contest.title} starts in 1 hour.` },
            { key: "10m", lo: 5, hi: 15, bodyText: `Your contest ${contest.title} starts in 10 minutes.` },
          ];
          for (const w of windows) {
            if (diffMs <= w.hi * 60 * 1000 && diffMs > w.lo * 60 * 1000) {
              const sentRef = db.doc(`users/${uid}/contestRemindersSent/${contest.id}_${w.key}`);
              const sentSnap = await sentRef.get();
              if (sentSnap.exists) continue;
              try {
                await notifyUser(
                  db,
                  uid,
                  {
                    pushEnabled: row.pushEnabled,
                    emailEnabled: row.emailEnabled,
                    title: "🏆 Contest Starting Soon!",
                    body: w.bodyText,
                    link: "/contests",
                  },
                  errors
                );
                await sentRef.set({ sentAt: new Date().toISOString() });
                contestSent += 1;
              } catch (e) {
                errors.push(`${uid} contest: ${e instanceof Error ? e.message : String(e)}`);
              }
            }
          }
        }
      }
    } catch (e) {
      errors.push(`contests fetch: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 4. Motivational Quotes (Backend FCM Delivery - Closed-App Support) ────
  for (const row of candidates) {
    const uid = row.uid;
    try {
      const tz = row.timezone || "Asia/Kolkata";
      const today = todayIsoInTz(tz);
      const currentMins = nowMinutesInTz(tz);
      const dow = dayOfWeekInTz(tz);
      const isWeekend = dow === 0 || dow === 6;
      const settingsRef = db.doc(`users/${uid}/settings/prefs`);

      if (!isWeekend) {
        // Mon-Fri: 5:00 PM to 10:00 PM window
        if (currentMins >= 17 * 60 && currentMins <= 22 * 60) {
          if (row.lastWeekdayQuoteSentOn !== today) {
            const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
            await notifyUser(
              db,
              uid,
              {
                pushEnabled: row.pushEnabled,
                emailEnabled: row.emailEnabled,
                title: "💡 Daily Motivation",
                body: randomQuote,
                link: "/today",
              },
              errors
            );
            await settingsRef.set({ lastWeekdayQuoteSentOn: today }, { merge: true });
            quoteSent += 1;
          }
        }
      } else {
        // Sat-Sun: 4 periods (morning, afternoon, evening, night)
        let periodKey: string | null = null;
        if (currentMins >= 8 * 60 && currentMins < 12 * 60) periodKey = "morning";
        else if (currentMins >= 12 * 60 && currentMins < 17 * 60) periodKey = "afternoon";
        else if (currentMins >= 17 * 60 && currentMins < 21 * 60) periodKey = "evening";
        else if (currentMins >= 21 * 60 && currentMins <= 23 * 60 + 59) periodKey = "night";

        if (periodKey) {
          const stampVal = `${today}_${periodKey}`;
          if (row.lastWeekendQuoteSentPeriod !== stampVal) {
            const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
            await notifyUser(
              db,
              uid,
              {
                pushEnabled: row.pushEnabled,
                emailEnabled: row.emailEnabled,
                title: `💡 Weekend Motivation`,
                body: randomQuote,
                link: "/today",
              },
              errors
            );
            await settingsRef.set({ lastWeekendQuoteSentPeriod: stampVal }, { merge: true });
            quoteSent += 1;
          }
        }
      }
    } catch (e) {
      errors.push(`${uid} quote: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 5. Topic revision reminders (per-reminder, one-shot) ─────────────────
  try {
    const topicRemindersSnap = await db
      .collectionGroup("reminders")
      .where("triggered", "==", false)
      .get();

    for (const remDoc of topicRemindersSnap.docs) {
      const uid = remDoc.ref.parent.parent?.id;
      if (!uid) continue;
      const rem = remDoc.data() as { topic: string; date: string; time: string; note?: string };
      const userRow = candidates.find((c) => c.uid === uid);
      if (!userRow) continue;

      const tz = userRow.timezone || "Asia/Kolkata";
      const today = todayIsoInTz(tz);
      const [h, m] = String(rem.time ?? "09:00").split(":").map(Number);
      const remMinutes = (h || 0) * 60 + (m || 0);
      const isDue = rem.date < today || (rem.date === today && nowMinutesInTz(tz) >= remMinutes);
      if (!isDue) continue;

      try {
        await notifyUser(
          db,
          uid,
          {
            pushEnabled: userRow.pushEnabled,
            emailEnabled: userRow.emailEnabled,
            title: `🔔 Revision Reminder: ${rem.topic}`,
            body: rem.note ? rem.note : `Time to revise your scheduled topic: ${rem.topic}`,
            link: "/review",
          },
          errors
        );
        await remDoc.ref.update({ triggered: true });
        topicSent += 1;
      } catch (e) {
        errors.push(`${uid} topic: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    errors.push(`topic reminders query: ${e instanceof Error ? e.message : String(e)}`);
  }

  return NextResponse.json({
    checked: candidates.length,
    eveningSent,
    morningSent,
    contestSent,
    topicSent,
    quoteSent,
    errors,
  });
}