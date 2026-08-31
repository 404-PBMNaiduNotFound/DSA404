import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class LinkedInAdapter implements PlatformAdapter {
  id = "linkedin" as const;
  name = "LinkedIn";
  color = "#0A66C2";
  baseUrl = "https://www.linkedin.com/in/";
  capabilities = PLATFORM_CAPABILITIES_MAP.linkedin;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("linkedin.com")) {
      const match = str.match(/linkedin\.com\/in\/([a-zA-Z0-9_.-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    if (!cleanUsername) {
      return normalizeProfileData(this.id, username, { status: "PROFILE_NOT_FOUND", errorDetails: "Invalid username format" });
    }

    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://www.linkedin.com/in/${cleanUsername}/`,
      status: "SUCCESS",
      dataSource: "Official API",
    });
  }
}
