"use client";

import React, { useState } from "react";
import { NormalizedCodingProfile } from "@/lib/coding-platforms/types";
import { DifficultyBreakdown } from "./DifficultyBreakdown";
import { PlatformHeatmapModal } from "./PlatformHeatmapModal";
import { ExternalLink, RefreshCw, AlertTriangle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformProfileCardProps {
  profile: NormalizedCodingProfile;
  color?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function resolvePlatformUrl(platform: string, username: string, explicitUrl?: string | null): string {
  if (explicitUrl && explicitUrl.trim()) return explicitUrl;
  const clean = username.trim().replace(/^@+/, "");
  const p = platform.toLowerCase();
  if (p === "leetcode") return `https://leetcode.com/u/${clean}/`;
  if (p === "codeforces") return `https://codeforces.com/profile/${clean}`;
  if (p === "codechef") return `https://www.codechef.com/users/${clean}`;
  if (p === "atcoder") return `https://atcoder.jp/users/${clean}`;
  if (p === "hackerrank") return `https://www.hackerrank.com/profile/${clean}`;
  if (p === "gfg" || p === "geeksforgeeks") return `https://www.geeksforgeeks.org/user/${clean}/`;
  if (p === "github") return `https://github.com/${clean}`;
  if (p === "linkedin") return `https://www.linkedin.com/in/${clean}/`;
  if (p === "topcoder") return `https://www.topcoder.com/members/${clean}`;
  if (p === "codewars") return `https://www.codewars.com/users/${clean}`;
  if (p === "spoj") return `https://www.spoj.com/users/${clean}`;
  if (p === "kattis") return `https://open.kattis.com/users/${clean}`;
  if (p === "kaggle") return `https://www.kaggle.com/${clean}`;
  if (p === "interviewbit") return `https://www.interviewbit.com/profile/${clean}`;
  if (p === "hackerearth") return `https://www.hackerearth.com/@${clean}`;
  if (p === "exercism") return `https://exercism.org/profiles/${clean}`;
  if (p === "cses") return `https://cses.fi/user/${clean}`;
  if (p === "code360") return `https://www.naukri.com/code360/profile/${clean}`;
  return explicitUrl || "#";
}

export function PlatformProfileCard({ profile, color = "#6366f1", onRefresh, isRefreshing }: PlatformProfileCardProps) {
  const [showHeatmapModal, setShowHeatmapModal] = useState(false);
  const isFailed = profile.status === "FETCH_FAILED" || profile.status === "PROFILE_NOT_FOUND";
  const isStaleFallback = profile.status === "TEMPORARY_ERROR";
  const isGithub = profile.platform === "github";
  const isLinkedin = profile.platform === "linkedin";

  const targetUrl = resolvePlatformUrl(profile.platform, profile.username, profile.profileUrl);

  const rankOrStar = profile.rank || (profile.badges && profile.badges[0]) || (profile.rating !== null ? `${profile.rating} Rating` : null);
  const hasDifficulty = profile.easySolved !== null || profile.mediumSolved !== null || profile.hardSolved !== null;

  return (
    <>
      <div
        className="flex flex-col justify-between rounded-3xl border border-white/10 p-5 backdrop-blur-xl transition-all hover:border-primary/50 shadow-xl space-y-4"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg font-extrabold truncate uppercase tracking-wide" style={{ color }}>
              {profile.platform}
            </span>
            {targetUrl && targetUrl !== "#" ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary hover:underline font-mono truncate transition-colors cursor-pointer"
                title={`Open ${profile.platform} profile (@${profile.username})`}
              >
                @{profile.username}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground font-mono truncate">@{profile.username}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {targetUrl && targetUrl !== "#" && (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title={`Open ${profile.platform} profile`}
              >
                <ExternalLink className="size-3.5" />
              </a>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh statistics"
              >
                <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-primary")} />
              </button>
            )}
          </div>
        </div>

        {/* Fallback Warning */}
        {isStaleFallback && (
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>Couldn't refresh latest stats. Showing last successful data.</span>
          </div>
        )}

        {/* Main Content: Metrics & Difficulty */}
        {isFailed ? (
          <div className="p-4 text-center text-xs text-rose-400/90 rounded-2xl border border-rose-500/20 bg-rose-500/5">
            {profile.errorDetails || "Fetch failed for this platform."}
          </div>
        ) : isGithub ? (
          /* GitHub Specific Card */
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-white/10 bg-background/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Repositories</span>
              <span className="font-black text-base text-foreground tabular-nums">
                {profile.platformSpecificData?.publicRepos ?? 0}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Followers</span>
              <span className="font-black text-base text-primary tabular-nums">
                {profile.platformSpecificData?.followers ?? 0}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Public Gists</span>
              <span className="font-black text-base text-emerald-400 tabular-nums">
                {profile.platformSpecificData?.publicGists ?? 0}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Following</span>
              <span className="font-black text-base text-amber-400 tabular-nums">
                {profile.platformSpecificData?.following ?? 0}
              </span>
            </div>
          </div>
        ) : isLinkedin ? (
          <div className="p-4 text-center text-xs text-foreground/80 rounded-2xl border border-white/10 bg-background/40 space-y-1">
            <p className="font-bold text-sky-400 text-sm">LinkedIn Profile Connected</p>
            <a
              href={profile.profileUrl || `https://www.linkedin.com/in/${profile.username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
            >
              View Professional Profile <ExternalLink className="size-3" />
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {profile.rating !== null && (
                <div className="rounded-2xl border border-white/10 bg-background/50 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rating</span>
                  <span className="font-black text-base text-foreground tabular-nums">
                    {profile.rating}
                  </span>
                </div>
              )}

              {rankOrStar && (
                <div className="rounded-2xl border border-white/10 bg-background/50 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rank / Stars</span>
                  <span className="font-extrabold text-sm text-amber-400 truncate block">
                    {rankOrStar}
                  </span>
                </div>
              )}

              {profile.totalSolved !== null && (
                <div className="rounded-2xl border border-white/10 bg-background/50 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Solved</span>
                  <span className="font-black text-base text-emerald-400 tabular-nums">
                    {profile.totalSolved}
                  </span>
                </div>
              )}

              {profile.contestsParticipated !== null && (
                <div className="rounded-2xl border border-white/10 bg-background/50 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Contests</span>
                  <span className="font-black text-base text-primary tabular-nums">
                    {profile.contestsParticipated}
                  </span>
                </div>
              )}
            </div>

            {/* Difficulty Breakdown - only if difficulty data exists */}
            {hasDifficulty && (
              <DifficultyBreakdown
                easy={profile.easySolved}
                medium={profile.mediumSolved}
                hard={profile.hardSolved}
                total={profile.totalSolved}
              />
            )}
          </div>
        )}

        {/* Footer: Source provenance & Modal Heatmap Popup Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground/70 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span>Source: {profile.dataSource}</span>
            <span>•</span>
            <span>Updated: {new Date(profile.fetchedAt).toLocaleDateString()}</span>
          </div>

          {/* Activity Heatmap Popup Button */}
          {!isFailed && !isLinkedin && (
            <button
              type="button"
              onClick={() => setShowHeatmapModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-primary/40 bg-background/60 hover:bg-primary/10 text-foreground/90 hover:text-primary transition-all shrink-0 shadow-sm ml-auto"
              title={`View ${profile.platform} Activity Heatmap`}
            >
              <Flame className="size-3.5 text-amber-500" />
              <span>Activity Heatmap</span>
            </button>
          )}
        </div>
      </div>

      {/* Heatmap Popup Modal */}
      <PlatformHeatmapModal
        open={showHeatmapModal}
        onOpenChange={setShowHeatmapModal}
        platformName={profile.platform}
        username={profile.username}
        profileUrl={targetUrl}
        submissionCalendar={profile.submissionCalendar || profile.platformSpecificData?.submissionCalendar}
        recentSubmissions={profile.recentSubmissions || profile.acceptedSubmissions}
        ratingHistory={profile.ratingHistory}
        totalSolved={profile.totalSolved}
        color={color}
      />
    </>
  );
}
