import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export class CodeforcesAdapter implements PlatformAdapter {
  id = "codeforces" as const;
  name = "Codeforces";
  color = "#1F8ACB";
  baseUrl = "https://codeforces.com/profile/";
  capabilities = PLATFORM_CAPABILITIES_MAP.codeforces;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("codeforces.com")) {
      const match = str.match(/codeforces\.com\/profile\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    if (!cleanUsername) {
      return normalizeProfileData(this.id, username, {
        status: "PROFILE_NOT_FOUND",
        errorDetails: "Invalid username format",
      });
    }

    try {
      const [infoRes, ratingRes, statusRes] = await Promise.all([
        fetchWithTimeout(`https://codeforces.com/api/user.info?handles=${cleanUsername}`),
        fetchWithTimeout(`https://codeforces.com/api/user.rating?handle=${cleanUsername}`),
        fetchWithTimeout(`https://codeforces.com/api/user.status?handle=${cleanUsername}&from=1&count=50`),
      ]);

      const infoData = infoRes.ok ? await infoRes.json() : null;
      if (!infoData || infoData.status !== "OK" || !infoData.result?.[0]) {
        return normalizeProfileData(this.id, cleanUsername, {
          status: "PROFILE_NOT_FOUND",
          errorDetails: "User not found on Codeforces",
        });
      }

      const user = infoData.result[0];
      const rating = user.rating ?? null;
      const maxRating = user.maxRating ?? rating;
      const rank = user.rank || null;
      const country = user.country || null;
      const avatarUrl = user.titlePhoto || user.avatar || null;

      let contestsParticipated: number | null = null;
      let ratingHistory: any[] | null = null;

      if (ratingRes.ok) {
        const ratingData = await ratingRes.json();
        if (ratingData.status === "OK" && Array.isArray(ratingData.result)) {
          contestsParticipated = ratingData.result.length;
          ratingHistory = ratingData.result.map((r: any) => ({
            contestName: r.contestName,
            contestId: String(r.contestId),
            rating: r.newRating,
            rank: r.rank,
            timestamp: r.ratingUpdateTimeSeconds * 1000,
            date: new Date(r.ratingUpdateTimeSeconds * 1000).toISOString().slice(0, 10),
          }));
        }
      }

      let totalSolved: number | null = null;
      let recentSubmissions: any[] | null = null;
      let cfTopicStats: { topic: string; solvedCount: number }[] | null = null;

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status === "OK" && Array.isArray(statusData.result)) {
          const solvedSet = new Set<string>();
          const tagCountMap: Record<string, number> = {};

          const tagMap: Record<string, string> = {
            "dp": "Dynamic Programming",
            "graphs": "Graphs",
            "dfs and similar": "Graphs",
            "trees": "Trees",
            "math": "Math",
            "number theory": "Math",
            "bitmasks": "Bit Manipulation",
            "greedy": "Greedy",
            "binary search": "Binary Search",
            "strings": "Strings",
            "data structures": "Arrays",
            "two pointers": "Arrays",
          };

          recentSubmissions = statusData.result.map((sub: any) => {
            const probId = `${sub.problem.contestId}-${sub.problem.index}`;
            if (sub.verdict === "OK" && !solvedSet.has(probId)) {
              solvedSet.add(probId);
              if (Array.isArray(sub.problem?.tags)) {
                for (const t of sub.problem.tags) {
                  const mapped = tagMap[t.toLowerCase()];
                  if (mapped) tagCountMap[mapped] = (tagCountMap[mapped] || 0) + 1;
                }
              }
            }
            return {
              id: String(sub.id),
              problemName: sub.problem.name,
              problemId: probId,
              problemUrl: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
              platform: "codeforces" as const,
              verdict: (sub.verdict === "OK" ? "Accepted" : "Wrong Answer") as "Accepted" | "Wrong Answer",
              language: sub.programmingLanguage,
              timestamp: new Date(sub.creationTimeSeconds * 1000).toISOString(),
            };
          });
          totalSolved = solvedSet.size;
          cfTopicStats = Object.entries(tagCountMap).map(([topic, count]) => ({ topic, solvedCount: count }));
        }
      }

      let rankStr: string | null = null;
      if (rating !== null) {
        if (rating >= 2400) rankStr = `${user.rank || "Grandmaster"} (7★)`;
        else if (rating >= 2100) rankStr = `${user.rank || "Master"} (6★)`;
        else if (rating >= 1900) rankStr = `${user.rank || "Candidate Master"} (5★)`;
        else if (rating >= 1600) rankStr = `${user.rank || "Expert"} (4★)`;
        else if (rating >= 1400) rankStr = `${user.rank || "Specialist"} (3★)`;
        else if (rating >= 1200) rankStr = `${user.rank || "Pupil"} (2★)`;
        else rankStr = `${user.rank || "Newbie"} (1★)`;
      } else if (user.rank) {
        rankStr = user.rank;
      }

      const calMap: Record<string, number> = {};
      if (recentSubmissions && Array.isArray(recentSubmissions)) {
        recentSubmissions.forEach((sub: any) => {
          if (sub.timestamp) {
            const d = sub.timestamp.slice(0, 10);
            calMap[d] = (calMap[d] || 0) + 1;
          }
        });
      }

      return normalizeProfileData(this.id, cleanUsername, {
        displayName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || cleanUsername,
        profileUrl: `https://codeforces.com/profile/${cleanUsername}`,
        avatarUrl,
        country,
        rank: rankStr,
        rating,
        maxRating,
        totalSolved,
        contestsParticipated,
        contestRating: rating,
        ratingHistory,
        recentSubmissions,
        acceptedSubmissions: recentSubmissions ? recentSubmissions.filter((s) => s.verdict === "Accepted") : null,
        submissionCalendar: Object.keys(calMap).length > 0 ? calMap : null,
        topicStats: cfTopicStats,
        status: "SUCCESS",
        dataSource: "Official API",
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, {
        status: "FETCH_FAILED",
        errorDetails: err.message || "Failed to fetch Codeforces profile",
      });
    }
  }
}
