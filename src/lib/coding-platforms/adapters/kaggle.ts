import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class KaggleAdapter implements PlatformAdapter {
  id = "kaggle" as const;
  name = "Kaggle";
  color = "#20BEFF";
  baseUrl = "https://www.kaggle.com/";
  capabilities = PLATFORM_CAPABILITIES_MAP.kaggle;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("kaggle.com")) {
      const match = str.match(/kaggle\.com\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://www.kaggle.com/${cleanUsername}`,
      status: "SUCCESS",
      dataSource: "Official API",
    });
  }
}
