import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class InterviewBitAdapter implements PlatformAdapter {
  id = "interviewbit" as const;
  name = "InterviewBit / Scaler";
  color = "#007BFF";
  baseUrl = "https://www.interviewbit.com/profile/";
  capabilities = PLATFORM_CAPABILITIES_MAP.interviewbit;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("interviewbit.com")) {
      const match = str.match(/interviewbit\.com\/profile\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://www.interviewbit.com/profile/${cleanUsername}`,
      status: "NOT_AVAILABLE",
      errorDetails: "InterviewBit profile connected",
    });
  }
}
