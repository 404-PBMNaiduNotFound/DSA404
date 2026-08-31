import { NormalizedCodingProfile, PlatformId } from "./types";

export interface TopicAnalysisResult {
  topic: string;
  totalSolved: number;
  coverageStatus: "STRONG" | "MODERATE" | "WEAK" | "UNPRACTICED";
  recommendationPriority: "HIGH" | "MEDIUM" | "LOW";
}

export interface DSA404ProfileAnalytics {
  totalSolvedAcrossPlatforms: number;
  totalContestsAcrossPlatforms: number;
  highestReportedRating: { rating: number; platform: PlatformId } | null;
  activePlatformsCount: number;
  topicAnalysis: TopicAnalysisResult[];
  strongTopics: string[];
  weakTopics: string[];
  unpracticedTopics: string[];
  recommendationHints: string[];
}

const CORE_TOPICS = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Stacks",
  "Queues",
  "Hashing",
  "Trees",
  "Graphs",
  "Greedy",
  "Binary Search",
  "Recursion",
  "Backtracking",
  "Dynamic Programming",
  "Bit Manipulation",
  "Math",
];

export function analyzeCodingProfiles(profiles: Record<string, NormalizedCodingProfile>): DSA404ProfileAnalytics {
  let totalSolvedAcrossPlatforms = 0;
  let totalContestsAcrossPlatforms = 0;
  let highestReportedRating: { rating: number; platform: PlatformId } | null = null;
  let activePlatformsCount = 0;

  const topicCounts: Record<string, number> = {};
  CORE_TOPICS.forEach((t) => (topicCounts[t] = 0));

  const solvedProblemSet = new Set<string>();

  for (const [platformKey, profile] of Object.entries(profiles)) {
    if (!profile || profile.status === "FETCH_FAILED" || profile.status === "PROFILE_NOT_FOUND") continue;

    activePlatformsCount++;

    if (profile.totalSolved) {
      totalSolvedAcrossPlatforms += profile.totalSolved;
    }

    if (profile.contestsParticipated) {
      totalContestsAcrossPlatforms += profile.contestsParticipated;
    }

    if (profile.rating && typeof profile.rating === "number") {
      if (!highestReportedRating || profile.rating > highestReportedRating.rating) {
        highestReportedRating = { rating: profile.rating, platform: profile.platform };
      }
    }

    // Process accepted submissions
    if (profile.acceptedSubmissions) {
      for (const sub of profile.acceptedSubmissions) {
        solvedProblemSet.add(`${profile.platform}:${sub.problemId.toLowerCase()}`);
      }
    }

    // Process topic stats if provided by platform
    if (profile.topicStats) {
      for (const ts of profile.topicStats) {
        if (topicCounts[ts.topic] !== undefined) {
          topicCounts[ts.topic] += ts.solvedCount;
        }
      }
    }
  }

  // Calculate topic analysis
  const topicAnalysis: TopicAnalysisResult[] = CORE_TOPICS.map((topic) => {
    const count = topicCounts[topic] || 0;
    let coverageStatus: TopicAnalysisResult["coverageStatus"] = "UNPRACTICED";
    let recommendationPriority: TopicAnalysisResult["recommendationPriority"] = "HIGH";

    if (count >= 30) {
      coverageStatus = "STRONG";
      recommendationPriority = "LOW";
    } else if (count >= 10) {
      coverageStatus = "MODERATE";
      recommendationPriority = "MEDIUM";
    } else if (count > 0) {
      coverageStatus = "WEAK";
      recommendationPriority = "HIGH";
    }

    return {
      topic,
      totalSolved: count,
      coverageStatus,
      recommendationPriority,
    };
  });

  const strongTopics = topicAnalysis.filter((t) => t.coverageStatus === "STRONG").map((t) => t.topic);
  const weakTopics = topicAnalysis.filter((t) => t.coverageStatus === "WEAK").map((t) => t.topic);
  const unpracticedTopics = topicAnalysis.filter((t) => t.coverageStatus === "UNPRACTICED").map((t) => t.topic);

  const recommendationHints: string[] = [];
  if (weakTopics.includes("Dynamic Programming") || unpracticedTopics.includes("Dynamic Programming")) {
    recommendationHints.push("Dynamic Programming coverage is low. Increase priority for DP practice problems.");
  }
  if (weakTopics.includes("Graphs") || unpracticedTopics.includes("Graphs")) {
    recommendationHints.push("Graph traversals and algorithms need reinforcement based on your profile stats.");
  }
  if (strongTopics.length > 0) {
    recommendationHints.push(`Strong foundation in ${strongTopics.slice(0, 3).join(", ")}. Keep maintaining streak!`);
  }

  return {
    totalSolvedAcrossPlatforms,
    totalContestsAcrossPlatforms,
    highestReportedRating,
    activePlatformsCount,
    topicAnalysis,
    strongTopics,
    weakTopics,
    unpracticedTopics,
    recommendationHints,
  };
}

/** Check if a problem is already solved on any connected platform */
export function isProblemAlreadySolvedOnPlatforms(
  platform: PlatformId,
  problemId: string,
  profiles: Record<string, NormalizedCodingProfile>
): boolean {
  const prof = profiles[platform];
  if (!prof || !prof.acceptedSubmissions) return false;

  const targetId = problemId.trim().toLowerCase();
  return prof.acceptedSubmissions.some(
    (sub) => sub.problemId.trim().toLowerCase() === targetId || sub.id.trim().toLowerCase() === targetId
  );
}
