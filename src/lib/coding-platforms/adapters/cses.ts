import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class CSESAdapter implements PlatformAdapter {
  id = "cses" as const;
  name = "CSES Problem Set";
  color = "#2B7BB9";
  baseUrl = "https://cses.fi/user/";
  capabilities = PLATFORM_CAPABILITIES_MAP.cses;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("cses.fi")) {
      const match = str.match(/cses\.fi\/user\/([0-9a-zA-Z_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: `CSES User #${cleanUsername}`,
      profileUrl: `https://cses.fi/user/${cleanUsername}`,
      status: "SUCCESS",
      dataSource: "Permitted Public Source",
    });
  }
}
