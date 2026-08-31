import { NormalizedCodingProfile, PlatformAdapter } from "../types";
import { PLATFORM_CAPABILITIES_MAP } from "../capabilities";
import { normalizeProfileData } from "../normalizer";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export class GFGAdapter implements PlatformAdapter {
  id = "gfg" as const;
  name = "GeeksforGeeks";
  color = "#2F8D46";
  baseUrl = "https://www.geeksforgeeks.org/user/";
  capabilities = PLATFORM_CAPABILITIES_MAP.gfg;

  extractUsername(input: string): string {
    if (!input) return "";
    let str = (typeof input === "string" ? input : String(input || "")).trim().replace(/\/+$/, "");
    if (str.includes("geeksforgeeks.org")) {
      const match = str.match(/geeksforgeeks\.org\/(?:user|profile)\/([a-zA-Z0-9_.-]+)/i);
      if (match && match[1]) return match[1];
    }
    return str.split("/").pop() || str;
  }

  async fetchProfile(username: string): Promise<NormalizedCodingProfile> {
    const cleanUsername = this.extractUsername(username);
    if (!cleanUsername) {
      return normalizeProfileData(this.id, username, { status: "PROFILE_NOT_FOUND", errorDetails: "Invalid username format" });
    }

    try {
      // 1. Try GFG practice auth page (contains exact total_problems_solved, score, name, and avatar)
      const authRes = await fetchWithTimeout(`https://auth.geeksforgeeks.org/user/${cleanUsername}/practice/`);
      if (authRes.ok) {
        const rawHtml = await authRes.text();
        const html = rawHtml.replace(/\\"/g, '"');

        const solvedMatch =
          html.match(/"total_problems_solved":\s*(\d+)/i) ||
          html.match(/"total_problem_solved":\s*(\d+)/i) ||
          html.match(/"totalProblemsSolved":\s*(\d+)/i) ||
          html.match(/"problems_solved":\s*(\d+)/i);

        const scoreMatch =
          html.match(/"score":\s*(\d+)/i) ||
          html.match(/"codingScore":\s*(\d+)/i) ||
          html.match(/"coding_score":\s*(\d+)/i);

        const avatarMatch =
          html.match(/"profile_image_url":"([^"]+)"/i) ||
          html.match(/"avatar":"([^"]+)"/i);

        const nameMatch =
          html.match(/"name":"([^"]+)"/i);

        const rating = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
        const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : null;
        const displayName = nameMatch && nameMatch[1] !== "viewport" ? nameMatch[1].trim() : cleanUsername;
        const avatarUrl = avatarMatch ? avatarMatch[1] : null;

        if (rating !== null || totalSolved !== null) {
          return normalizeProfileData(this.id, cleanUsername, {
            displayName,
            profileUrl: `https://www.geeksforgeeks.org/user/${cleanUsername}/`,
            avatarUrl,
            rating,
            totalSolved,
            rank: rating ? `${rating} Score` : null,
            status: "SUCCESS",
            dataSource: "Official API",
          });
        }
      }

      // 2. Try GFG main profile page fallback
      const pageRes = await fetchWithTimeout(`https://www.geeksforgeeks.org/user/${cleanUsername}/`);
      if (pageRes.ok) {
        const rawHtml = await pageRes.text();
        const html = rawHtml.replace(/\\"/g, '"');

        const solvedMatch =
          html.match(/"total_problems_solved":\s*(\d+)/i) ||
          html.match(/"total_problem_solved":\s*(\d+)/i) ||
          html.match(/"totalProblemsSolved":\s*(\d+)/i) ||
          html.match(/"problems_solved":\s*(\d+)/i) ||
          html.match(/Total\s*Problems?\s*Solved[^0-9]*(\d+)/i) ||
          html.match(/"total_solved":\s*(\d+)/i);

        const scoreMatch =
          html.match(/"score":\s*(\d+)/i) ||
          html.match(/"codingScore":\s*(\d+)/i) ||
          html.match(/"coding_score":\s*(\d+)/i) ||
          html.match(/Overall\s*Coding\s*Score[^0-9]*(\d+)/i);

        const avatarMatch =
          html.match(/"profile_image_url":"([^"]+)"/i) ||
          html.match(/"avatar":"([^"]+)"/i);

        const nameMatch =
          html.match(/"name":"([^"]+)"/i) ||
          html.match(/<h1[^>]*>([^<]+)<\/h1>/i);

        const rating = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
        const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : null;
        const displayName = nameMatch && nameMatch[1] !== "viewport" ? nameMatch[1].trim() : cleanUsername;
        const avatarUrl = avatarMatch ? avatarMatch[1] : null;

        return normalizeProfileData(this.id, cleanUsername, {
          displayName,
          profileUrl: `https://www.geeksforgeeks.org/user/${cleanUsername}/`,
          avatarUrl,
          rating,
          totalSolved,
          rank: rating ? `${rating} Score` : null,
          status: "SUCCESS",
          dataSource: "Scraped",
        });
      }

      return normalizeProfileData(this.id, cleanUsername, {
        status: "PROFILE_NOT_FOUND",
        errorDetails: "GeeksforGeeks profile not found",
      });
    } catch (err: any) {
      return normalizeProfileData(this.id, cleanUsername, {
        status: "FETCH_FAILED",
        errorDetails: err.message || "Failed to fetch GeeksforGeeks profile",
      });
    }
  }
}
