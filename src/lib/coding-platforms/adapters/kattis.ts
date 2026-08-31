import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class KattisAdapter implements PlatformAdapter {
  id = "kattis" as const;
  name = "Kattis";
  color = "#4966A0";
  baseUrl = "https://open.kattis.com/users/";
  capabilities = PLATFORM_CAPABILITIES_MAP.kattis;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("kattis.com")) {
      const match = str.match(/kattis\.com\/users\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://open.kattis.com/users/${cleanUsername}`,
      status: "SUCCESS",
      dataSource: "Permitted Public Source",
    });
  }
}
