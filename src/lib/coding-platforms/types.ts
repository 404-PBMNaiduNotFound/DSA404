export type PlatformId =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "atcoder"
  | "hackerrank"
  | "gfg"
  | "hackerearth"
  | "code360"
  | "interviewbit"
  | "cses"
  | "spoj"
  | "topcoder"
  | "kattis"
  | "codewars"
  | "exercism"
  | "kaggle"
  | "github"
  | "linkedin";

export type FetchStatus =
  | "SUCCESS"
  | "PARTIAL"
  | "NOT_AVAILABLE"
  | "PROFILE_NOT_FOUND"
  | "PRIVATE_PROFILE"
  | "RATE_LIMITED"
  | "AUTH_REQUIRED"
  | "FETCH_FAILED"
  | "TEMPORARY_ERROR";

export interface PlatformCapabilities {
  profile: boolean;
  rating: boolean;
  ratingHistory: boolean;
  solvedProblems: boolean;
  difficultyStats: boolean;
  contestStats: boolean;
  contestHistory: boolean;
  recentSubmissions: boolean;
  languageStats: boolean;
  badges: boolean;
  streak: boolean;
  topicStats: boolean;
}

export interface MetricProvenance<T> {
  value: T;
  source: string;
  fetchedAt: string;
  official: boolean;
  available: boolean;
}

export interface RatingRecord {
  contestName: string;
  contestId?: string;
  rating: number;
  rank?: number;
  timestamp: number; // Unix epoch ms or seconds
  date: string; // YYYY-MM-DD
}

export interface SubmissionRecord {
  id: string;
  problemName: string;
  problemId: string;
  problemUrl?: string;
  platform: PlatformId;
  verdict: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Memory Limit Exceeded" | "Runtime Error" | "Compilation Error" | "Other";
  language?: string;
  timestamp: string; // ISO date
  difficulty?: "Easy" | "Medium" | "Hard" | string;
}

export interface TopicStatistic {
  topic: string;
  solvedCount: number;
  totalAttempts?: number;
  masteryPercentage?: number;
}

export interface NormalizedCodingProfile {
  platform: PlatformId;
  username: string;
  displayName: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  country: string | null;

  rank: string | number | null;
  rating: number | null;
  maxRating: number | null;

  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;

  contestsParticipated: number | null;
  contestRating: number | null;
  ratingHistory: RatingRecord[] | null;

  recentSubmissions: SubmissionRecord[] | null;
  acceptedSubmissions: SubmissionRecord[] | null;

  languages: Record<string, number> | null; // language -> count
  badges: string[] | null;
  streak: number | null;
  submissionCalendar?: Record<string, number> | null; // YYYY-MM-DD -> count

  topicStats: TopicStatistic[] | null;

  lastActivity: string | null;
  fetchedAt: string;

  status: FetchStatus;
  dataSource: "Official API" | "Official GraphQL/REST" | "Permitted Public Source" | "Third-Party API" | "Scraped" | "Cache Fallback";
  errorDetails?: string;

  platformSpecificData?: Record<string, any>;
  capabilities: PlatformCapabilities;
}

export interface ConnectedPlatform {
  platform: PlatformId;
  username: string;
  profileUrl?: string;
  connectedAt: string;
  lastSyncedAt?: string;
  lastSyncStatus?: FetchStatus;
  syncError?: string;
}

export interface SyncLog {
  id: string;
  userId: string;
  platform: PlatformId;
  startedAt: string;
  completedAt: string;
  status: FetchStatus;
  recordsFetched: number;
  error?: string;
}

export interface PlatformAdapter {
  id: PlatformId;
  name: string;
  color: string;
  baseUrl: string;
  capabilities: PlatformCapabilities;

  extractUsername(urlOrUsername: string): string;
  fetchProfile(username: string): Promise<NormalizedCodingProfile>;
}
