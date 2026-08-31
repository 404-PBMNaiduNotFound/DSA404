import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class TopcoderAdapter implements PlatformAdapter {
  id = "topcoder" as const;
  name = "Topcoder";
  color = "#00A9E0";
  baseUrl = "https://www.topcoder.com/members/";
  capabilities = PLATFORM_CAPABILITIES_MAP.topcoder;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("topcoder.com")) {
      const match = str.match(/topcoder\.com\/members\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://www.topcoder.com/members/${cleanUsername}`,
      status: "SUCCESS",
      dataSource: "Official API",
    });
  }
}
