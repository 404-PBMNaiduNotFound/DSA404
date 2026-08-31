import { NormalizedCodingProfile, PlatformId, SyncLog } from "./types";
import { registry } from "./registry";
import { cache } from "./cache";
import { createEmptyProfile } from "./normalizer";

export async function syncUserProfile(
  platform: PlatformId,
  username: string,
  forceRefresh = false
): Promise<NormalizedCodingProfile> {
  const uStr = typeof username === "string" ? username : (username ? String(username) : "");
  if (!uStr.trim()) {
    const empty = createEmptyProfile(platform, uStr);
    empty.status = "NOT_AVAILABLE";
    empty.errorDetails = "Empty username";
    return empty;
  }
  username = uStr;

  const startedAt = new Date().toISOString();

  // 1. Check valid cache unless forceRefresh
  if (!forceRefresh) {
    const cached = cache.get(platform, username);
    if (cached) return cached;
  }

  // 2. Resolve adapter
  const adapter = registry.getAdapter(platform);
  if (!adapter) {
    const empty = createEmptyProfile(platform, username);
    empty.status = "NOT_AVAILABLE";
    empty.errorDetails = `No adapter registered for ${platform}`;
    return empty;
  }

  // 3. Fetch fresh profile
  try {
    const freshProfile = await adapter.fetchProfile(username);
    const completedAt = new Date().toISOString();

    if (freshProfile.status === "SUCCESS" || freshProfile.status === "PARTIAL") {
      cache.set(platform, username, freshProfile);
      return freshProfile;
    }

    // Handle failure case: retain previous cached successful profile data if present
    const previousSuccessful = cache.getStaleOrCached(platform, username);
    if (previousSuccessful && previousSuccessful.status === "SUCCESS") {
      return {
        ...previousSuccessful,
        status: "TEMPORARY_ERROR",
        errorDetails: `Sync failed (${freshProfile.errorDetails || freshProfile.status}). Showing last successful data from ${previousSuccessful.fetchedAt}.`,
      };
    }

    return freshProfile;
  } catch (err: any) {
    const previousSuccessful = cache.getStaleOrCached(platform, username);
    if (previousSuccessful && previousSuccessful.status === "SUCCESS") {
      return {
        ...previousSuccessful,
        status: "TEMPORARY_ERROR",
        errorDetails: `Network error: ${err.message || "Fetch failed"}. Showing last successful data.`,
      };
    }

    const failed = createEmptyProfile(platform, username);
    failed.status = "FETCH_FAILED";
    failed.errorDetails = err.message || "Synchronization failed";
    return failed;
  }
}

export async function syncBatchProfiles(
  profiles: { platform: PlatformId; username: string }[],
  forceRefresh = false
): Promise<Record<string, NormalizedCodingProfile>> {
  const results: Record<string, NormalizedCodingProfile> = {};

  await Promise.all(
    profiles.map(async ({ platform, username }) => {
      if ((platform as string) === "customLinks" || (platform as string) === "platformStats") return;
      const uStr = typeof username === "string" ? username : (username ? String(username) : "");
      if (!uStr.trim()) return;
      const res = await syncUserProfile(platform, uStr, forceRefresh);
      results[platform] = res;
    })
  );

  return results;
}
