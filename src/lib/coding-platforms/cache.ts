import { NormalizedCodingProfile, PlatformId } from "./types";

interface CacheEntry {
  profile: NormalizedCodingProfile;
  cachedAt: number; // Unix timestamp ms
  ttlMs: number;
}

class ProfileCache {
  private cache: Map<string, CacheEntry> = new Map();

  // Configurable TTLs in milliseconds
  private readonly DEFAULT_STATISTICS_TTL = 6 * 60 * 60 * 1000; // 6 hours
  private readonly RECENT_SUBMISSIONS_TTL = 2 * 60 * 60 * 1000; // 2 hours

  private getKey(platform: PlatformId, username: any): string {
    const uStr = typeof username === "string" ? username : (username ? String(username) : "");
    return `${String(platform || "").toLowerCase()}:${uStr.trim().toLowerCase()}`;
  }

  public get(platform: PlatformId, username: string, maxAgeMs?: number): NormalizedCodingProfile | null {
    const key = this.getKey(platform, username);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const ttl = maxAgeMs || entry.ttlMs || this.DEFAULT_STATISTICS_TTL;
    const isExpired = Date.now() - entry.cachedAt > ttl;

    if (isExpired) return null;
    return entry.profile;
  }

  public getStaleOrCached(platform: PlatformId, username: string): NormalizedCodingProfile | null {
    const key = this.getKey(platform, username);
    const entry = this.cache.get(key);
    return entry ? entry.profile : null;
  }

  public set(platform: PlatformId, username: string, profile: NormalizedCodingProfile, customTtlMs?: number): void {
    const key = this.getKey(platform, username);
    this.cache.set(key, {
      profile,
      cachedAt: Date.now(),
      ttlMs: customTtlMs || this.DEFAULT_STATISTICS_TTL,
    });
  }

  public clear(platform?: PlatformId, username?: string): void {
    if (platform && username) {
      this.cache.delete(this.getKey(platform, username));
    } else {
      this.cache.clear();
    }
  }
}

export const cache = new ProfileCache();
