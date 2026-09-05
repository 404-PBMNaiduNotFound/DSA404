import { SECTIONS } from "@/lib/a2z-data";
import { EXTRA_PROBLEMS, type Sheet } from "@/lib/extra-problems-data";
import type { Difficulty } from "@/lib/types";

export type Platform = "All" | "LeetCode" | "GeeksforGeeks" | "GFG" | "HackerRank" | "CodeStudio";
export type SheetFilter = "All" | "Core 404" | Sheet;

export interface FlatProblem {
  name: string;
  difficulty: Difficulty;
  platform: Platform;
  topic: string;
  sheet: SheetFilter;
  link: string;
}

function canonicalPlatform(p: string): Platform {
  if (p === "LC" || p === "LeetCode") return "LeetCode";
  if (p === "GFG" || p === "GeeksforGeeks") return "GeeksforGeeks";
  if (p === "HR" || p === "HackerRank") return "HackerRank";
  if (p === "CS" || p === "CodeStudio") return "CodeStudio";
  return "LeetCode";
}

function buildAllProblems(): FlatProblem[] {
  const a2z: FlatProblem[] = SECTIONS.flatMap((sec) =>
    sec.problems.map((p) => {
      const plat = canonicalPlatform(p.p);
      const link = p.l || "";
      return {
        name: p.n,
        difficulty: p.d,
        platform: plat,
        topic: sec.section,
        sheet: "Core 404" as SheetFilter,
        link,
      };
    }),
  );

  const extra: FlatProblem[] = EXTRA_PROBLEMS.map((p) => ({
    name: p.name,
    difficulty: p.difficulty,
    platform: p.platform as Platform,
    topic: p.topic,
    sheet: p.sheet as SheetFilter,
    link: p.link || "",
  }));

  const seen = new Set<string>();
  return [...a2z, ...extra].filter((p) => {
    const key = `${p.sheet}|${p.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const ALL_PROBLEMS = buildAllProblems();

const CANONICAL_MAP = new Map<string, string>();
ALL_PROBLEMS.forEach((p) => {
  if (p.link) {
    CANONICAL_MAP.set(p.name.toLowerCase().trim(), p.link);
  }
});

export function getCanonicalProblemLink(name: string): string | undefined {
  if (!name) return undefined;
  return CANONICAL_MAP.get(name.toLowerCase().trim());
}
