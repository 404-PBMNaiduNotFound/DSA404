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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export class GitHubAdapter implements PlatformAdapter {
  id = "github" as const;
  name = "GitHub";
  color = "#6E7681";
  baseUrl = "https://github.com/";
  capabilities = PLATFORM_CAPABILITIES_MAP.github;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("github.com")) {
      const match = str.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    if (!cleanUsername) {
      return normalizeProfileData(this.id, username, { status: "PROFILE_NOT_FOUND", errorDetails: "Invalid username format" });
    }

    try {
      // 1. Fetch GitHub user basic profile
      const userRes = await fetchWithTimeout(`https://api.github.com/users/${cleanUsername}`);
      if (!userRes.ok) {
        return normalizeProfileData(this.id, cleanUsername, { status: "PROFILE_NOT_FOUND", errorDetails: "GitHub profile not found" });
      }
      const data = await userRes.json();

      // 2. Fetch GitHub contributions calendar (full 1-year daily activity)
      const calendarMap: Record<string, number> = {};
      let totalContributions = 0;
      let streak = 0;

      try {
        const contribRes = await fetchWithTimeout(`https://github-contributions-api.jogruber.de/v4/${cleanUsername}?y=last`, {}, 3000);
        if (contribRes.ok) {
          const contribData = await contribRes.json();
          if (contribData && Array.isArray(contribData.contributions)) {
            contribData.contributions.forEach((item: { date: string; count: number }) => {
              if (item.date && item.count > 0) {
                calendarMap[item.date] = item.count;
                totalContributions += item.count;
              }
            });
          }
        }
      } catch (cErr) {
        console.warn("GitHub contribution calendar fetch fallback:", cErr);
      }

      // 3. Fetch public events as recentSubmissions / supplemental activity
      const recentSubs: Array<{ timestamp: string; date: string; problemName: string; verdict: string }> = [];
      try {
        const eventsRes = await fetchWithTimeout(`https://api.github.com/users/${cleanUsername}/events/public`, {}, 2500);
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          if (Array.isArray(events)) {
            events.slice(0, 30).forEach((ev: any) => {
              if (ev.created_at) {
                const dateKey = ev.created_at.slice(0, 10);
                calendarMap[dateKey] = (calendarMap[dateKey] || 0) + 1;
                recentSubs.push({
                  timestamp: ev.created_at,
                  date: dateKey,
                  problemName: `${ev.type ? ev.type.replace(/Event$/, "") : "Activity"} on ${ev.repo?.name || "GitHub"}`,
                  verdict: "Pushed",
                });
              }
            });
          }
        }
      } catch (eErr) {
        console.warn("GitHub events fetch fallback:", eErr);
      }

      const totalSolvedCount = totalContributions > 0 ? totalContributions : Object.values(calendarMap).reduce((a, b) => a + b, 0);

      return normalizeProfileData(this.id, cleanUsername, {
        displayName: data.name || cleanUsername,
        profileUrl: `https://github.com/${cleanUsername}`,
        avatarUrl: data.avatar_url || null,
        country: data.location || null,
        rating: null,
        contestsParticipated: null,
        totalSolved: totalSolvedCount > 0 ? totalSolvedCount : null,
        rank: null,
        submissionCalendar: Object.keys(calendarMap).length > 0 ? calendarMap : null,
        recentSubmissions: recentSubs.length > 0 ? recentSubs : null,
        streak: streak || null,
        status: "SUCCESS",
        dataSource: "Official API",
        platformSpecificData: {
          publicRepos: data.public_repos ?? 0,
          followers: data.followers ?? 0,
          publicGists: data.public_gists ?? 0,
          following: data.following ?? 0,
          submissionCalendar: Object.keys(calendarMap).length > 0 ? calendarMap : null,
        },
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, { status: "FETCH_FAILED", errorDetails: err.message });
    }
  }
}
