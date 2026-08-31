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

export class CodewarsAdapter implements PlatformAdapter {
  id = "codewars" as const;
  name = "Codewars";
  color = "#B1361E";
  baseUrl = "https://www.codewars.com/users/";
  capabilities = PLATFORM_CAPABILITIES_MAP.codewars;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("codewars.com")) {
      const match = str.match(/codewars\.com\/users\/([a-zA-Z0-9_-]+)/i);
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
      const res = await fetchWithTimeout(`https://www.codewars.com/api/v1/users/${cleanUsername}`);
      if (!res.ok) {
        return normalizeProfileData(this.id, cleanUsername, { status: "PROFILE_NOT_FOUND", errorDetails: "User not found on Codewars" });
      }

      const data = await res.json();
      const rankName = data.ranks?.overall?.name || null;
      const honor = data.honor ?? null;
      const totalSolved = data.codeChallenges?.totalCompleted ?? null;

      return normalizeProfileData(this.id, cleanUsername, {
        displayName: data.name || cleanUsername,
        profileUrl: `https://www.codewars.com/users/${cleanUsername}`,
        rank: rankName,
        rating: honor,
        totalSolved,
        status: "SUCCESS",
        dataSource: "Official API",
        languages: data.ranks?.languages ? Object.fromEntries(Object.entries(data.ranks.languages).map(([k, v]: [string, any]) => [k, v.score || 0])) : null,
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, { status: "FETCH_FAILED", errorDetails: err.message });
    }
  }
}
