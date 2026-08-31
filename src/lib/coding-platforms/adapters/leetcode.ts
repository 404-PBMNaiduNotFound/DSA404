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
        "Accept-Language": "en-US,en;q=0.9",
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export class LeetCodeAdapter implements PlatformAdapter {
  id = "leetcode" as const;
  name = "LeetCode";
  color = "#FFA116";
  baseUrl = "https://leetcode.com/u/";
  capabilities = PLATFORM_CAPABILITIES_MAP.leetcode;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("leetcode.com")) {
      const match = str.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9_.-]+)/i);
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
      // 1. Try LeetCode official GraphQL API
      const query = `
        query userProfile($username: String!) {
          matchedUser(username: $username) {
            username
            submissionCalendar
            profile {
              realName
              userAvatar
              ranking
              reputation
            }
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
          userContestRanking(username: $username) {
            rating
            globalRanking
            totalParticipants
            topPercentage
            attendedContestsCount
          }
          userContestRankingHistory(username: $username) {
            attended
            rating
            ranking
            trendDirection
            problemsSolved
            totalProblems
            finishTimeInSeconds
            contest {
              title
              startTime
            }
          }
          recentAcSubmissionList(username: $username, limit: 20) {
            id
            title
            titleSlug
            timestamp
          }
        }
      `;

      const res = await fetchWithTimeout("https://leetcode.com/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
        body: JSON.stringify({ query, variables: { username: cleanUsername } }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.data?.matchedUser) {
          const matched = data.data.matchedUser;
          const contest = data.data.userContestRanking;
          const contestHistory = data.data.userContestRankingHistory;
          const submissions = data.data.recentAcSubmissionList;

          const acNums: { difficulty: string; count: number }[] = matched.submitStats?.acSubmissionNum || [];
          const easySolved = acNums.find((x) => x.difficulty === "Easy")?.count ?? 0;
          const mediumSolved = acNums.find((x) => x.difficulty === "Medium")?.count ?? 0;
          const hardSolved = acNums.find((x) => x.difficulty === "Hard")?.count ?? 0;
          const totalSolved = acNums.find((x) => x.difficulty === "All")?.count ?? (easySolved + mediumSolved + hardSolved);

          const rating = contest?.rating ? Math.round(contest.rating) : null;
          const contestsParticipated = contest?.attendedContestsCount ?? null;

          // Parse submission calendar
          let parsedCalendar: Record<string, number> | null = null;
          if (matched.submissionCalendar) {
            try {
              const rawCal = typeof matched.submissionCalendar === "string" ? JSON.parse(matched.submissionCalendar) : matched.submissionCalendar;
              if (rawCal && typeof rawCal === "object") {
                parsedCalendar = {};
                for (const [tsStr, count] of Object.entries(rawCal)) {
                  const sec = Number(tsStr);
                  if (!isNaN(sec)) {
                    const dateKey = new Date(sec * 1000).toISOString().slice(0, 10);
                    parsedCalendar[dateKey] = (parsedCalendar[dateKey] || 0) + Number(count);
                  }
                }
              }
            } catch {}
          }

          // Extract rating history
          const formattedHistory = Array.isArray(contestHistory)
            ? contestHistory
                .filter((c: any) => c.attended)
                .map((c: any) => ({
                  contestName: c.contest?.title || "Contest",
                  rating: Math.round(c.rating),
                  rank: c.ranking,
                  timestamp: (c.contest?.startTime || 0) * 1000,
                  date: new Date((c.contest?.startTime || 0) * 1000).toISOString().slice(0, 10),
                }))
            : null;

          // Extract recent submissions
          const formattedSubmissions = Array.isArray(submissions)
            ? submissions.map((sub: any) => ({
                id: String(sub.id || sub.titleSlug + "-" + sub.timestamp),
                problemName: sub.title,
                problemId: sub.titleSlug,
                problemUrl: `https://leetcode.com/problems/${sub.titleSlug}/`,
                platform: "leetcode" as const,
                verdict: "Accepted" as const,
                timestamp: new Date(parseInt(sub.timestamp, 10) * 1000).toISOString(),
              }))
            : null;

          let rankStr: string | null = null;
          if (rating) {
            if (rating >= 2200) rankStr = "Guardian (5★)";
            else if (rating >= 1800) rankStr = "Knight (4★)";
            else if (rating >= 1600) rankStr = "3★";
            else if (rating >= 1400) rankStr = "2★";
            else if (rating > 0) rankStr = "1★";
          } else if (matched.profile?.ranking) {
            rankStr = `Rank #${matched.profile.ranking}`;
          }

          return normalizeProfileData(this.id, cleanUsername, {
            displayName: matched.profile?.realName || cleanUsername,
            profileUrl: `https://leetcode.com/u/${cleanUsername}/`,
            avatarUrl: matched.profile?.userAvatar || null,
            rank: rankStr,
            rating,
            maxRating: formattedHistory && formattedHistory.length > 0 ? Math.max(...formattedHistory.map((h) => h.rating)) : rating,
            totalSolved,
            easySolved,
            mediumSolved,
            hardSolved,
            contestsParticipated,
            contestRating: rating,
            ratingHistory: formattedHistory,
            recentSubmissions: formattedSubmissions,
            acceptedSubmissions: formattedSubmissions,
            submissionCalendar: parsedCalendar,
            status: "SUCCESS",
            dataSource: "Official GraphQL/REST",
          });
        }
      }

      // 2. Fallback REST API
      const fallbackRes = await fetchWithTimeout(`https://leetcode-stats-api.herokuapp.com/${cleanUsername}`);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.status === "success") {
          return normalizeProfileData(this.id, cleanUsername, {
            displayName: cleanUsername,
            profileUrl: `https://leetcode.com/u/${cleanUsername}/`,
            rank: fallbackData.ranking ? `Rank #${fallbackData.ranking}` : null,
            totalSolved: fallbackData.totalSolved ?? null,
            easySolved: fallbackData.easySolved ?? null,
            mediumSolved: fallbackData.mediumSolved ?? null,
            hardSolved: fallbackData.hardSolved ?? null,
            submissionCalendar: fallbackData.submissionCalendar ?? null,
            status: "SUCCESS",
            dataSource: "Permitted Public Source",
          });
        }
      }

      return normalizeProfileData(this.id, cleanUsername, {
        status: "PROFILE_NOT_FOUND",
        errorDetails: "User profile not found on LeetCode",
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, {
        status: "FETCH_FAILED",
        errorDetails: err.message || "Failed to fetch LeetCode profile",
      });
    }
  }
}
