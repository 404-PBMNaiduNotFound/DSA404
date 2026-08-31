import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class Code360Adapter implements PlatformAdapter {
  id = "code360" as const;
  name = "Coding Ninjas / Code360";
  color = "#DD5000";
  baseUrl = "https://www.naukri.com/code360/profile/";
  capabilities = PLATFORM_CAPABILITIES_MAP.code360;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("code360") || str.includes("codingninjas")) {
      const match = str.match(/(?:code360|codingninjas\.com)\/profile\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://www.naukri.com/code360/profile/${cleanUsername}`,
      status: "NOT_AVAILABLE",
      errorDetails: "Code360 profile linked successfully",
    });
  }
}
