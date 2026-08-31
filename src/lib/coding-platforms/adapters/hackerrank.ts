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

export class HackerRankAdapter implements PlatformAdapter {
  id = "hackerrank" as const;
  name = "HackerRank";
  color = "#00EA64";
  baseUrl = "https://www.hackerrank.com/profile/";
  capabilities = PLATFORM_CAPABILITIES_MAP.hackerrank;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("hackerrank.com")) {
      const match = str.match(/hackerrank\.com\/(?:profile\/)?([a-zA-Z0-9_-]+)/i);
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
      const res = await fetchWithTimeout(`https://www.hackerrank.com/rest/hackers/${cleanUsername}/profile`);
      if (!res.ok) {
        return normalizeProfileData(this.id, cleanUsername, { status: "PROFILE_NOT_FOUND", errorDetails: "HackerRank user not found" });
      }

      const data = await res.json();
      const model = data.model;
      if (!model) {
        return normalizeProfileData(this.id, cleanUsername, { status: "PROFILE_NOT_FOUND", errorDetails: "Missing profile data" });
      }

      let maxStars = 0;
      const badges: string[] = [];
      if (Array.isArray(model.badges)) {
        for (const b of model.badges) {
          if (b.stars && b.stars > maxStars) maxStars = b.stars;
          if (b.badge_name) badges.push(`${b.badge_name} (${b.stars || 0}★)`);
        }
      }

      const rating = model.score ? Math.round(model.score) : null;
      const totalSolved = model.solved_challenges_count ?? null;
      const contestsParticipated = model.contests_count ?? null;

      return normalizeProfileData(this.id, cleanUsername, {
        displayName: model.name || cleanUsername,
        profileUrl: `https://www.hackerrank.com/profile/${cleanUsername}`,
        avatarUrl: model.avatar || null,
        country: model.country || null,
        rank: maxStars > 0 ? `${maxStars} Star Hacker` : null,
        rating,
        totalSolved,
        contestsParticipated,
        badges: badges.length > 0 ? badges : null,
        status: "SUCCESS",
        dataSource: "Official API",
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, { status: "FETCH_FAILED", errorDetails: err.message });
    }
  }
}
