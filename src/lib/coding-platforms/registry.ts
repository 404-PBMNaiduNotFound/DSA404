import { PlatformAdapter, PlatformId } from "./types";
import { LeetCodeAdapter } from "./adapters/leetcode";
import { CodeforcesAdapter } from "./adapters/codeforces";
import { CodeChefAdapter } from "./adapters/codechef";
import { AtCoderAdapter } from "./adapters/atcoder";
import { HackerRankAdapter } from "./adapters/hackerrank";
import { GFGAdapter } from "./adapters/gfg";
import { GitHubAdapter } from "./adapters/github";
import { CodewarsAdapter } from "./adapters/codewars";
import { HackerEarthAdapter } from "./adapters/hackerearth";
import { Code360Adapter } from "./adapters/code360";
import { InterviewBitAdapter } from "./adapters/interviewbit";
import { CSESAdapter } from "./adapters/cses";
import { SPOJAdapter } from "./adapters/spoj";
import { TopcoderAdapter } from "./adapters/topcoder";
import { KattisAdapter } from "./adapters/kattis";
import { ExercismAdapter } from "./adapters/exercism";
import { KaggleAdapter } from "./adapters/kaggle";
import { LinkedInAdapter } from "./adapters/linkedin";
import { detectPlatformAndUsername } from "./detector";

class PlatformAdapterRegistry {
  private adapters: Map<PlatformId, PlatformAdapter> = new Map();

  constructor() {
    this.register(new LeetCodeAdapter());
    this.register(new CodeforcesAdapter());
    this.register(new CodeChefAdapter());
    this.register(new AtCoderAdapter());
    this.register(new HackerRankAdapter());
    this.register(new GFGAdapter());
    this.register(new GitHubAdapter());
    this.register(new LinkedInAdapter());
    this.register(new CodewarsAdapter());
    this.register(new HackerEarthAdapter());
    this.register(new Code360Adapter());
    this.register(new InterviewBitAdapter());
    this.register(new CSESAdapter());
    this.register(new SPOJAdapter());
    this.register(new TopcoderAdapter());
    this.register(new KattisAdapter());
    this.register(new ExercismAdapter());
    this.register(new KaggleAdapter());
  }

  public register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(platform: PlatformId): PlatformAdapter | null {
    return this.adapters.get(platform) || null;
  }

  public getAllAdapters(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  public resolveInput(input: string): { platform: PlatformId | null; username: string; adapter: PlatformAdapter | null } {
    const detection = detectPlatformAndUsername(input);
    if (detection.platform !== "UNKNOWN") {
      const adapter = this.getAdapter(detection.platform);
      return { platform: detection.platform, username: detection.username, adapter };
    }
    return { platform: null, username: detection.username, adapter: null };
  }
}

export const registry = new PlatformAdapterRegistry();
