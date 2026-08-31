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

export class CodeChefAdapter implements PlatformAdapter {
  id = "codechef" as const;
  name = "CodeChef";
  color = "#5B4638";
  baseUrl = "https://www.codechef.com/users/";
  capabilities = PLATFORM_CAPABILITIES_MAP.codechef;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("codechef.com")) {
      const match = str.match(/codechef\.com\/users\/([a-zA-Z0-9_-]+)/i);
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
      // 1. Fetch public profile HTML page
      const res = await fetchWithTimeout(`https://www.codechef.com/users/${cleanUsername}`);
      if (!res.ok) {
        if (res.status === 429) {
          return normalizeProfileData(this.id, cleanUsername, {
            status: "RATE_LIMITED",
            errorDetails: "CodeChef rate limit reached. Retrying shortly...",
          });
        }
        return normalizeProfileData(this.id, cleanUsername, {
          status: "PROFILE_NOT_FOUND",
          errorDetails: "User not found on CodeChef",
        });
      }

      const html = await res.text();

      let rating: number | null = null;
      let maxRating: number | null = null;
      let history: any[] = [];

      // Extract rating graph history array
      const allRatingMatch = html.match(/var\s+all_rating\s*=\s*(\[.*?\]);/s);
      if (allRatingMatch && allRatingMatch[1]) {
        try {
          const parsedHistory = JSON.parse(allRatingMatch[1]);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            history = parsedHistory;
            const last = history[history.length - 1];
            if (last && last.rating) rating = parseInt(last.rating, 10);

            const maxVal = Math.max(...history.map((h: any) => (h.rating ? parseInt(h.rating, 10) : 0)));
            if (maxVal > 0) maxRating = maxVal;
          }
        } catch (e) {}
      }

      // Fallback rating extraction from HTML if all_rating was empty
      if (rating === null) {
        const ratingMatch =
          html.match(/class="rating-header"[^>]*>.*?(\d{3,4})/is) ||
          html.match(/class="rating-number"[^>]*>.*?(\d{3,4})/is) ||
          html.match(/rating-number font-36 font-bold[^>]*>(\d+)</i) ||
          html.match(/"currentRating":\s*(\d+)/i);
        if (ratingMatch) rating = parseInt(ratingMatch[1], 10);
      }

      if (maxRating === null && rating !== null) {
        const maxRatingMatch = html.match(/\(Highest Rating\s*(\d+)\)/i) || html.match(/"highestRating":\s*(\d+)/i);
        maxRating = maxRatingMatch ? parseInt(maxRatingMatch[1], 10) : rating;
      }

      // Extract stars
      const starMatch =
        html.match(/(\d+)★/i) ||
        html.match(/(\d+)\s*&#9733;/i) ||
        html.match(/class="rating font-18 font-bold[^>]*>(\d+★)/i) ||
        html.match(/class="rating">(\d+★)/i);

      let stars = starMatch ? `${starMatch[1].replace(/★/g, "")}★` : null;

      if (!stars && rating !== null) {
        if (rating >= 2500) stars = "7★";
        else if (rating >= 2200) stars = "6★";
        else if (rating >= 2000) stars = "5★";
        else if (rating >= 1800) stars = "4★";
        else if (rating >= 1600) stars = "3★";
        else if (rating >= 1400) stars = "2★";
        else if (rating > 0) stars = "1★";
      }

      // Extract total solved
      const solvedMatch =
        html.match(/Total\s*Problems?\s*Solved:[^0-9]*(\d+)/i) ||
        html.match(/Fully\s*Solved\s*\(([^)]+)\)/i) ||
        html.match(/Total\s*Problems?\s*Solved[^0-9]*(\d+)/i) ||
        html.match(/"totalSolved":\s*(\d+)/i);
      const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : null;

      // Format rating history
      const formattedHistory = history.length > 0
        ? history.map((h: any) => ({
            contestName: h.name || h.code || "Contest",
            rating: parseInt(h.rating, 10),
            rank: h.rank ? parseInt(h.rank, 10) : undefined,
            date: h.end_date ? h.end_date.slice(0, 10) : (h.getyear ? `${h.getyear}-${String(h.getmonth).padStart(2, "0")}-${String(h.getday).padStart(2, "0")}` : ""),
            timestamp: h.end_date ? new Date(h.end_date).getTime() : (h.getyear ? new Date(parseInt(h.getyear), parseInt(h.getmonth) - 1, parseInt(h.getday)).getTime() : 0),
          }))
        : null;

      const rankStr = stars ? `${stars} Star` : (rating ? `${rating} Rating` : null);

      return normalizeProfileData(this.id, cleanUsername, {
        displayName: cleanUsername,
        profileUrl: `https://www.codechef.com/users/${cleanUsername}`,
        rank: rankStr,
        rating,
        maxRating: maxRating ?? rating,
        totalSolved,
        contestsParticipated: history.length > 0 ? history.length : (rating ? 1 : null),
        contestRating: rating,
        ratingHistory: formattedHistory,
        badges: stars ? [stars] : null,
        status: "SUCCESS",
        dataSource: "Permitted Public Source",
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, {
        status: "FETCH_FAILED",
        errorDetails: err.message || "Failed to fetch CodeChef profile",
      });
    }
  }
}
