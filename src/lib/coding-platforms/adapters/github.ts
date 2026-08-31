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
      const res = await fetchWithTimeout(`https://api.github.com/users/${cleanUsername}`);
      if (!res.ok) {
        return normalizeProfileData(this.id, cleanUsername, { status: "PROFILE_NOT_FOUND", errorDetails: "GitHub profile not found" });
      }

      const data = await res.json();
      return normalizeProfileData(this.id, cleanUsername, {
        displayName: data.name || cleanUsername,
        profileUrl: `https://github.com/${cleanUsername}`,
        avatarUrl: data.avatar_url || null,
        country: data.location || null,
        rating: null,
        contestsParticipated: null,
        totalSolved: null,
        rank: null,
        status: "SUCCESS",
        dataSource: "Official API",
        platformSpecificData: {
          publicRepos: data.public_repos ?? 0,
          followers: data.followers ?? 0,
          publicGists: data.public_gists ?? 0,
          following: data.following ?? 0,
        },
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, { status: "FETCH_FAILED", errorDetails: err.message });
    }
  }
}
