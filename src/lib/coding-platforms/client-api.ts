import { NormalizedCodingProfile, PlatformId } from "./types";

export async function fetchUserProfileApi(
  platform: PlatformId,
  username: string,
  forceRefresh = false
): Promise<NormalizedCodingProfile> {
  const url = `/api/coding-platforms?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(username)}${forceRefresh ? "&refresh=true" : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.profile;
}

export async function fetchBatchProfilesApi(
  profiles: { platform: PlatformId; username: string }[],
  forceRefresh = false
): Promise<Record<string, NormalizedCodingProfile>> {
  const res = await fetch("/api/coding-platforms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profiles, forceRefresh }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.profiles || {};
}
