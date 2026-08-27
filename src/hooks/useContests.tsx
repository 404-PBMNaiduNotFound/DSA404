"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useAuth } from "./useAuth";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Contest {
  id: string; // unique: platform + start time / slug
  platform: "Codeforces" | "CodeChef" | "LeetCode" | "HackerRank" | "HackerEarth";
  title: string;
  startMs: number; // UTC epoch ms
  durationMs: number;
  url: string;
}

export type ContestStatus = "live" | "upcoming" | "missed";
export type UserMark = "attended" | "missed_intentional" | null;

export interface ContestWithStatus extends Contest {
  status: ContestStatus;
  endMs: number;
  mark: UserMark;
}

interface StoredData {
  marks: Record<string, UserMark>; // contestId -> mark
  lastFetchedMs: number;
  cachedContests: Contest[];
}

const LOCAL_STORAGE_KEY_CONTESTS = "ldt_cached_contests_v3";
const LOCAL_STORAGE_KEY_MARKS = "ldt_cached_marks_v3";


function dedup(contests: Contest[]): Contest[] {
  const seen = new Set<string>();
  const titleSeen = new Set<string>();
  return contests.filter((c) => {
    const titleKey = `${c.platform}-${c.title.toLowerCase().trim()}`;
    if (seen.has(c.id) || titleSeen.has(titleKey)) return false;
    seen.add(c.id);
    titleSeen.add(titleKey);
    return true;
  });
}

async function fetchApiRoute(): Promise<Contest[]> {
  try {
    const r = await fetch("/api/contests", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

async function fetchAllContests(): Promise<Contest[]> {
  const apiContests = await fetchApiRoute();
  if (apiContests.length > 0) {
    return dedup(apiContests).sort((a, b) => a.startMs - b.startMs);
  }
  return [];
}

// ─── Status classifier ────────────────────────────────────────────────────────

export function getContestStatus(c: Contest, now: number): ContestStatus {
  const end = c.startMs + c.durationMs;
  if (now >= c.startMs && now < end) return "live";
  if (now < c.startMs) return "upcoming";
  return "missed";
}

// ─── Firestore & LocalStorage helpers ─────────────────────────────────────────

function storeDoc(uid: string) {
  return doc(db!, "users", uid, "contestMeta", "tracking");
}

async function loadStored(uid: string): Promise<StoredData | null> {
  try {
    const snap = await getDoc(storeDoc(uid));
    if (!snap.exists()) return null;
    return snap.data() as StoredData;
  } catch {
    return null;
  }
}

async function saveStored(uid: string, data: Partial<StoredData>) {
  try {
    await setDoc(storeDoc(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } catch {
    // non-critical
  }
}

function getLocalData(): { contests: Contest[]; marks: Record<string, UserMark>; lastFetchedMs: number } {
  if (typeof window === "undefined") return { contests: [], marks: {}, lastFetchedMs: 0 };
  try {
    const rawC = localStorage.getItem(LOCAL_STORAGE_KEY_CONTESTS);
    const rawM = localStorage.getItem(LOCAL_STORAGE_KEY_MARKS);
    const contests = rawC ? JSON.parse(rawC) : [];
    const marks = rawM ? JSON.parse(rawM) : {};
    const lastFetchedMs = parseInt(localStorage.getItem(`${LOCAL_STORAGE_KEY_CONTESTS}_ts`) || "0", 10);
    return { contests, marks, lastFetchedMs };
  } catch {
    return { contests: [], marks: {}, lastFetchedMs: 0 };
  }
}

function setLocalData(contests: Contest[], marks: Record<string, UserMark>, ts?: number) {
  if (typeof window === "undefined") return;
  try {
    if (contests.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY_CONTESTS, JSON.stringify(contests));
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_MARKS, JSON.stringify(marks));
    if (ts) {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_CONTESTS}_ts`, String(ts));
    }
  } catch {
    // ignore quota issues
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContests() {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [marks, setMarks] = useState<Record<string, UserMark>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fetchedRef = useRef(false);

  // Tick every second for live countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Listen to mark updates across components
  useEffect(() => {
    const handleMarkEvent = (e: CustomEvent<{ contestId: string; mark: UserMark }>) => {
      if (e.detail) {
        setMarks((prev) => ({ ...prev, [e.detail.contestId]: e.detail.mark }));
      }
    };
    window.addEventListener("ldt_contest_mark_updated" as any, handleMarkEvent as any);
    return () => {
      window.removeEventListener("ldt_contest_mark_updated" as any, handleMarkEvent as any);
    };
  }, []);

  // Load from local storage immediately (zero-lag), then hydrate/refresh asynchronously
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fast initial load from localStorage
    const local = getLocalData();
    if (local.contests.length > 0) {
      setContests(local.contests);
      setMarks(local.marks);
      setLoading(false);
    }

    (async () => {
      setError(null);

      try {
        let marksData = local.marks;
        let stored: StoredData | null = null;

        if (user) {
          stored = await loadStored(user.uid);
          if (stored?.marks) {
            marksData = { ...marksData, ...stored.marks };
          }
        }

        setMarks(marksData);

        const nowMs = Date.now();
        const cachedList = stored?.cachedContests?.length ? stored.cachedContests : local.contests;

        if (cachedList.length > 0) {
          setContests(cachedList);
          setLoading(false);
        }

        // Always fetch fresh contests asynchronously to ensure latest contests (CodeChef, CF, LeetCode, etc.)
        const fresh = await fetchAllContests();
        if (fresh.length > 0) {
          setContests(fresh);
          setLocalData(fresh, marksData, nowMs);
          if (user) {
            await saveStored(user.uid, {
              cachedContests: fresh,
              lastFetchedMs: nowMs,
              marks: marksData,
            });
          }
        }
        setLoading(false);
      } catch (e) {
        if (!contests.length && !local.contests.length) {
          setError("Could not load contests. Check your connection.");
        }
        setLoading(false);
      }
    })();
  }, [user]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchAllContests();
      if (fresh.length > 0) {
        setContests(fresh);
        setLocalData(fresh, marks, Date.now());
      }
    } catch {
      setError("Failed to refresh contests.");
    } finally {
      setLoading(false);
    }
  }, [marks]);

  // Mark a contest as attended or missed-intentional
  const markContest = useCallback(
    async (contestId: string, mark: UserMark) => {
      setMarks((prev) => {
        const next = { ...prev, [contestId]: mark };
        
        // Defer side effects to next tick so they don't run during React's render phase
        setTimeout(() => {
          setLocalData(contests, next);
          if (user) {
            saveStored(user.uid, { marks: next });
          }
          // Broadcast custom event so all active components sync instantly
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("ldt_contest_mark_updated", {
                detail: { contestId, mark },
              })
            );
          }
        }, 0);
        
        return next;
      });
    },
    [user, contests]
  );

  // Derive final list with statuses
  const enriched: ContestWithStatus[] = contests.map((c) => ({
    ...c,
    endMs: c.startMs + c.durationMs,
    status: getContestStatus(c, now),
    mark: marks[c.id] ?? null,
  }));

  return { contests: enriched, loading, error, now, markContest, refetch };
}
