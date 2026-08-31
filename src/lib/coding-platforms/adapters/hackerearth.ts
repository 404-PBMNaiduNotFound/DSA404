import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class HackerEarthAdapter implements PlatformAdapter {
  id = "hackerearth" as const;
  name = "HackerEarth";
  color = "#2C3454";
  baseUrl = "https://www.hackerearth.com/@";
  capabilities = PLATFORM_CAPABILITIES_MAP.hackerearth;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("hackerearth.com")) {
      const match = str.match(/hackerearth\.com\/@([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.replace(/^@/, "").split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://www.hackerearth.com/@${cleanUsername}`,
      status: "NOT_AVAILABLE",
      errorDetails: "HackerEarth API requires authentication; link connected",
    });
  }
}
