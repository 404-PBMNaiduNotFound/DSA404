import { NormalizedCodingProfile, PlatformId } from "./types";
import { PLATFORM_CAPABILITIES_MAP } from "./capabilities";

export function createEmptyProfile(platform: PlatformId, username: string): NormalizedCodingProfile {
  const caps = PLATFORM_CAPABILITIES_MAP[platform] || {
    profile: true,
    rating: false,
    ratingHistory: false,
    solvedProblems: false,
    difficultyStats: false,
    contestStats: false,
    contestHistory: false,
    recentSubmissions: false,
    languageStats: false,
    badges: false,
    streak: false,
    topicStats: false,
  };

  return {
    platform,
    username,
    displayName: null,
    profileUrl: null,
    avatarUrl: null,
    country: null,
    rank: null,
    rating: null,
    maxRating: null,
    totalSolved: null,
    easySolved: null,
    mediumSolved: null,
    hardSolved: null,
    contestsParticipated: null,
    contestRating: null,
    ratingHistory: null,
    recentSubmissions: null,
    acceptedSubmissions: null,
    languages: null,
    badges: null,
    streak: null,
    submissionCalendar: null,
    topicStats: null,
    lastActivity: null,
    fetchedAt: new Date().toISOString(),
    status: "TEMPORARY_ERROR",
    dataSource: "Official API",
    capabilities: caps,
  };
}

export function normalizeProfileData(
  platform: PlatformId,
  username: string,
  data: Partial<NormalizedCodingProfile>
): NormalizedCodingProfile {
  const base = createEmptyProfile(platform, username);
  return {
    ...base,
    ...data,
    platform,
    username,
    fetchedAt: data.fetchedAt || new Date().toISOString(),
    capabilities: PLATFORM_CAPABILITIES_MAP[platform] || base.capabilities,
  };
}
