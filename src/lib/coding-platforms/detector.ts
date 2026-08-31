import { PlatformId } from "./types";

export interface DetectionResult {
  platform: PlatformId | "UNKNOWN";
  username: string;
  confidence: number; // 0 to 1
}

const URL_PATTERNS: { platform: PlatformId; regex: RegExp; extractIndex: number }[] = [
  { platform: "leetcode", regex: /(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "codeforces", regex: /(?:https?:\/\/)?(?:www\.)?codeforces\.com\/profile\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "codechef", regex: /(?:https?:\/\/)?(?:www\.)?codechef\.com\/users\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "atcoder", regex: /(?:https?:\/\/)?atcoder\.jp\/users\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "hackerrank", regex: /(?:https?:\/\/)?(?:www\.)?hackerrank\.com\/(?:profile\/)?([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "gfg", regex: /(?:https?:\/\/)?(?:www\.)?geeksforgeeks\.org\/user\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "hackerearth", regex: /(?:https?:\/\/)?(?:www\.)?hackerearth\.com\/@([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "code360", regex: /(?:https?:\/\/)?(?:www\.)?(?:naukri\.com\/code360|codingninjas\.com)\/profile\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "interviewbit", regex: /(?:https?:\/\/)?(?:www\.)?interviewbit\.com\/profile\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "cses", regex: /(?:https?:\/\/)?cses\.fi\/user\/([0-9a-zA-Z_.-]+)/i, extractIndex: 1 },
  { platform: "spoj", regex: /(?:https?:\/\/)?(?:www\.)?spoj\.com\/users\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "topcoder", regex: /(?:https?:\/\/)?(?:www\.)?topcoder\.com\/members\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "kattis", regex: /(?:https?:\/\/)?open\.kattis\.com\/users\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "codewars", regex: /(?:https?:\/\/)?(?:www\.)?codewars\.com\/users\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "exercism", regex: /(?:https?:\/\/)?exercism\.org\/profiles\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "kaggle", regex: /(?:https?:\/\/)?(?:www\.)?kaggle\.com\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "github", regex: /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
  { platform: "linkedin", regex: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_.-]+)/i, extractIndex: 1 },
];

export function detectPlatformAndUsername(input: string): DetectionResult {
  if (!input) {
    return { platform: "UNKNOWN", username: "", confidence: 0 };
  }

  // Strip query parameters and trailing slashes
  const cleanInput = input.trim().split("?")[0].replace(/\/+$/, "");

  // Try URL pattern matching
  for (const item of URL_PATTERNS) {
    const match = cleanInput.match(item.regex);
    if (match && match[item.extractIndex]) {
      return {
        platform: item.platform,
        username: match[item.extractIndex],
        confidence: 0.95,
      };
    }
  }

  // If simple string handle without URL, return UNKNOWN platform with 0 confidence
  const parts = cleanInput.split("/").filter(Boolean);
  const candidate = parts[parts.length - 1] || cleanInput;

  return {
    platform: "UNKNOWN",
    username: candidate,
    confidence: 0,
  };
}
