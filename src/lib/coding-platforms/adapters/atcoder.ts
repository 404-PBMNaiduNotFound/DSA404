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

export class AtCoderAdapter implements PlatformAdapter {
  id = "atcoder" as const;
  name = "AtCoder";
  color = "#8BC4E8";
  baseUrl = "https://atcoder.jp/users/";
  capabilities = PLATFORM_CAPABILITIES_MAP.atcoder;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("atcoder.jp")) {
      const match = str.match(/atcoder\.jp\/users\/([a-zA-Z0-9_-]+)/i);
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
      const [acRes, pageRes] = await Promise.all([
        fetchWithTimeout(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${cleanUsername}`),
        fetchWithTimeout(`https://atcoder.jp/users/${cleanUsername}`),
      ]);

      let totalSolved: number | null = null;
      if (acRes.ok) {
        const acData = await acRes.json();
        totalSolved = acData.count ?? null;
      }

      let rating: number | null = null;
      let maxRating: number | null = null;
      let contestsParticipated: number | null = null;
      let rank: string | null = null;

      if (pageRes.ok) {
        const html = await pageRes.text();

        const ratingMatch = html.match(/Rating<\/span><\/td><td><span[^>]*>(\d+)<\/span>/i);
        if (ratingMatch) rating = parseInt(ratingMatch[1], 10);

        const maxMatch = html.match(/Highest Rating<\/span><\/td><td><span[^>]*>(\d+)<\/span>/i);
        if (maxMatch) maxRating = parseInt(maxMatch[1], 10);

        const matchCount = html.match(/Rated Matches<\/span><\/td><td>(\d+)<\/td>/i);
        if (matchCount) contestsParticipated = parseInt(matchCount[1], 10);

        if (rating !== null) {
          if (rating >= 2800) rank = "Red (7★)";
          else if (rating >= 2400) rank = "Orange (6★)";
          else if (rating >= 2000) rank = "Yellow (5★)";
          else if (rating >= 1600) rank = "Blue (4★)";
          else if (rating >= 1200) rank = "Cyan (3★)";
          else if (rating >= 800) rank = "Green (2★)";
          else if (rating > 0) rank = "Brown (1★)";
          else rank = "Gray";
        }
      }

      if (totalSolved === null && rating === null) {
        return normalizeProfileData(this.id, cleanUsername, {
          status: "PROFILE_NOT_FOUND",
          errorDetails: "AtCoder user not found",
        });
      }

      return normalizeProfileData(this.id, cleanUsername, {
        displayName: cleanUsername,
        profileUrl: `https://atcoder.jp/users/${cleanUsername}`,
        rank,
        rating,
        maxRating: maxRating || rating,
        totalSolved,
        contestsParticipated,
        contestRating: rating,
        status: "SUCCESS",
        dataSource: "Permitted Public Source",
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, {
        status: "FETCH_FAILED",
        errorDetails: err.message || "Failed to fetch AtCoder profile",
      });
    }
  }
}
