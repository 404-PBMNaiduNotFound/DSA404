import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

export class ExercismAdapter implements PlatformAdapter {
  id = "exercism" as const;
  name = "Exercism";
  color = "#0078D7";
  baseUrl = "https://exercism.org/profiles/";
  capabilities = PLATFORM_CAPABILITIES_MAP.exercism;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("exercism.org")) {
      const match = str.match(/exercism\.org\/profiles\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    return normalizeProfileData(this.id, cleanUsername, {
      displayName: cleanUsername,
      profileUrl: `https://exercism.org/profiles/${cleanUsername}`,
      status: "SUCCESS",
      dataSource: "Official API",
    });
  }
}
