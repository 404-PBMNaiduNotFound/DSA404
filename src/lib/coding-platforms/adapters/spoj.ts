import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class SPOJAdapter implements PlatformAdapter {
  id = "spoj" as const;
  name = "SPOJ";
  color = "#2072B8";
  baseUrl = "https://www.spoj.com/users/";
  capabilities = PLATFORM_CAPABILITIES_MAP.spoj;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("spoj.com")) {
      const match = str.match(/spoj\.com\/users\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://www.spoj.com/users/${cleanUsername}`,
      status: "SUCCESS",
      dataSource: "Permitted Public Source",
    });
  }
}
