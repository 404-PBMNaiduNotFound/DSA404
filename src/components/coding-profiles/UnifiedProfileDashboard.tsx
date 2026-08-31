"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ConnectedPlatform, NormalizedCodingProfile, PlatformId } from "@/lib/coding-platforms/types";
import { fetchBatchProfilesApi, fetchUserProfileApi } from "@/lib/coding-platforms/client-api";
import { analyzeCodingProfiles } from "@/lib/coding-platforms/analytics";
import { PlatformProfileCard } from "./PlatformProfileCard";
import { PlatformConnectCard } from "./PlatformConnectCard";
import { ContestHistoryChart } from "./ContestHistoryChart";
import { savePlatformStats } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Globe, RefreshCw, Trophy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UnifiedProfileDashboardProps {
  initialProfiles?: Record<string, string>; // platformId -> username
  initialStats?: Record<string, NormalizedCodingProfile | any>;
  userId?: string;
  onSaveProfiles?: (profiles: Record<string, string>) => void;
  readOnly?: boolean;
}

export function UnifiedProfileDashboard({
  initialProfiles = {},
  initialStats = {},
  userId,
  onSaveProfiles,
  readOnly = false,
}: UnifiedProfileDashboardProps) {
  const [connectedProfiles, setConnectedProfiles] = useState<Record<string, string>>(initialProfiles);
  const attemptedRef = React.useRef<Set<string>>(new Set());

  const getLocalCachedStats = (): Record<string, NormalizedCodingProfile> => {
    if (initialStats && Object.keys(initialStats).length > 0) return initialStats;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`dsa_platform_stats_${userId || "default"}`);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }
    return {};
  };

  const [fetchedData, setFetchedData] = useState<Record<string, NormalizedCodingProfile>>(getLocalCachedStats);
  const [loading, setLoading] = useState(false);
  const [refreshingPlatform, setRefreshingPlatform] = useState<string | null>(null);

  useEffect(() => {
    setConnectedProfiles(initialProfiles);
  }, [JSON.stringify(initialProfiles)]);

  useEffect(() => {
    if (initialStats && Object.keys(initialStats).length > 0) {
      setFetchedData((prev) => ({ ...initialStats, ...prev }));
      Object.keys(initialStats).forEach((p) => {
        if (connectedProfiles[p]) {
          attemptedRef.current.add(`${p}:${connectedProfiles[p]}`);
        }
      });
    }
  }, [initialStats]);

  // Fetch initial profile stats only once per unique platform+username pair
  useEffect(() => {
    const list = Object.entries(connectedProfiles)
      .filter(([k, u]) => k !== "customLinks" && k !== "platformStats" && typeof u === "string" && Boolean(u.trim()))
      .map(([p, u]) => ({ platform: p as PlatformId, username: u as string }));

    if (list.length === 0) {
      setLoading(false);
      return;
    }

    // Filter to only items that haven't been successfully fetched yet or are missing calendar data
    const missing = list.filter((item) => {
      const key = `${item.platform}:${item.username}`;
      if (attemptedRef.current.has(key)) return false;
      const existing = fetchedData[item.platform];
      if (
        existing &&
        existing.status === "SUCCESS" &&
        (existing.submissionCalendar !== undefined || item.platform === "linkedin")
      ) {
        return false;
      }
      return true;
    });

    if (missing.length === 0) {
      setLoading(false);
      return;
    }

    // Mark as attempted to avoid duplicate parallel requests
    missing.forEach((item) => attemptedRef.current.add(`${item.platform}:${item.username}`));

    setLoading(true);
    fetchBatchProfilesApi(missing, true)
      .then((res) => {
        setFetchedData((prev) => {
          const next = { ...prev, ...res };
          if (typeof window !== "undefined") {
            localStorage.setItem(`dsa_platform_stats_${userId || "default"}`, JSON.stringify(next));
          }
          if (userId) {
            void savePlatformStats(userId, next).catch(console.warn);
          }
          return next;
        });
      })
      .catch((err) => {
        console.warn("Failed to sync connected profiles:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [JSON.stringify(connectedProfiles), userId]);

  const handleConnect = async (platform: PlatformId, username: string) => {
    const next = { ...connectedProfiles, [platform]: username };
    setConnectedProfiles(next);
    if (onSaveProfiles) onSaveProfiles(next);

    setRefreshingPlatform(platform);
    try {
      const res = await fetchUserProfileApi(platform, username, true);
      setFetchedData((prev) => {
        const updated = { ...prev, [platform]: res };
        if (typeof window !== "undefined") {
          localStorage.setItem(`dsa_platform_stats_${userId || "default"}`, JSON.stringify(updated));
        }
        if (userId) {
          void savePlatformStats(userId, updated).catch(console.warn);
        }
        return updated;
      });
    } catch (err: any) {
      toast.error(`Could not sync ${platform}`, { description: err.message });
    } finally {
      setRefreshingPlatform(null);
    }
  };

  const handleRefreshSingle = async (platform: PlatformId) => {
    const username = connectedProfiles[platform];
    if (!username) return;

    setRefreshingPlatform(platform);
    try {
      const res = await fetchUserProfileApi(platform, username, true);
      setFetchedData((prev) => {
        const updated = { ...prev, [platform]: res };
        if (typeof window !== "undefined") {
          localStorage.setItem(`dsa_platform_stats_${userId || "default"}`, JSON.stringify(updated));
        }
        if (userId) {
          void savePlatformStats(userId, updated).catch(console.warn);
        }
        return updated;
      });
      toast.success(`Updated ${platform.toUpperCase()} profile stats!`);
    } catch (err: any) {
      toast.error(`Refresh failed for ${platform}`, { description: err.message });
    } finally {
      setRefreshingPlatform(null);
    }
  };

  const handleRefreshAll = async () => {
    const list = Object.entries(connectedProfiles)
      .filter(([k, u]) => k !== "customLinks" && k !== "platformStats" && typeof u === "string" && Boolean(u.trim()))
      .map(([p, u]) => ({ platform: p as PlatformId, username: u as string }));

    if (list.length === 0) return;
    setLoading(true);
    try {
      const res = await fetchBatchProfilesApi(list, true);
      setFetchedData((prev) => {
        const merged = { ...prev, ...res };
        if (typeof window !== "undefined") {
          localStorage.setItem(`dsa_platform_stats_${userId || "default"}`, JSON.stringify(merged));
        }
        if (userId) {
          void savePlatformStats(userId, merged).catch(console.warn);
        }
        return merged;
      });
      toast.success("All connected platform stats updated and saved!");
    } catch (err: any) {
      toast.error("Refresh failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Compute aggregate analytics
  const analytics = useMemo(() => analyzeCodingProfiles(fetchedData), [fetchedData]);

  // Aggregate contest histories
  const activeContestHistories = useMemo(() => {
    const items: { platform: string; history: any[]; color: string }[] = [];
    for (const [key, p] of Object.entries(fetchedData)) {
      if (p.ratingHistory && p.ratingHistory.length > 0) {
        items.push({
          platform: p.platform.toUpperCase(),
          history: p.ratingHistory,
          color: key === "leetcode" ? "#FFA116" : key === "codeforces" ? "#1F8ACB" : "#5B4638",
        });
      }
    }
    return items;
  }, [fetchedData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Summary Bar ── */}
      <section className="rounded-3xl border border-white/15 bg-card/80 p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Globe className="size-6 text-primary" />
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">Unified Coding Profile</h2>
              <p className="text-xs text-muted-foreground">Multi-Platform Coding Identity Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={loading}
              className="gap-2 rounded-xl border-white/10 text-xs font-bold"
            >
              <RefreshCw className={cn("size-3.5 text-primary", loading && "animate-spin")} />
              <span>{loading ? "Refreshing..." : "Refresh All Platforms"}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-background/50 p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Connected Platforms</p>
            <p className="font-black text-2xl tabular-nums text-primary mt-1">{analytics.activePlatformsCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/50 p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Solved</p>
            <p className="font-black text-2xl tabular-nums text-emerald-400 mt-1">{analytics.totalSolvedAcrossPlatforms}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/50 p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Peak Platform Rating</p>
            <p className="font-black text-2xl tabular-nums text-amber-400 mt-1">
              {analytics.highestReportedRating
                ? `${analytics.highestReportedRating.rating} (${analytics.highestReportedRating.platform.toUpperCase()})`
                : "N/A"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/50 p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Contests</p>
            <p className="font-black text-2xl tabular-nums text-purple-400 mt-1">{analytics.totalContestsAcrossPlatforms}</p>
          </div>
        </div>
      </section>

      {/* ── Connect New Platform ── */}
      {!readOnly && <PlatformConnectCard onConnect={handleConnect} existingPlatforms={connectedProfiles} />}

      {/* ── Platform Profile Cards ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-400" />
          Connected Platform Stats
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(connectedProfiles)
            .filter(([k, u]) => k !== "customLinks" && k !== "platformStats" && typeof u === "string" && Boolean(u.trim()))
            .map(([platformKey, username]) => {
              const profile = fetchedData[platformKey] || {
                platform: platformKey as PlatformId,
                username,
                displayName: username,
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
                topicStats: null,
                lastActivity: null,
                fetchedAt: new Date().toISOString(),
                status: "TEMPORARY_ERROR",
                dataSource: "Official API",
                capabilities: {
                  profile: true,
                  rating: true,
                  ratingHistory: false,
                  solvedProblems: true,
                  difficultyStats: true,
                  contestStats: true,
                  contestHistory: false,
                  recentSubmissions: false,
                  languageStats: false,
                  badges: false,
                  streak: false,
                  topicStats: false,
                },
              };

              return (
                <PlatformProfileCard
                  key={platformKey}
                  profile={profile}
                  onRefresh={() => handleRefreshSingle(platformKey as PlatformId)}
                  isRefreshing={refreshingPlatform === platformKey}
                />
              );
            })}
          {Object.keys(connectedProfiles).filter((k) => k !== "customLinks" && k !== "platformStats" && typeof connectedProfiles[k] === "string" && Boolean(connectedProfiles[k].trim())).length === 0 && (
            <p className="col-span-full text-xs text-muted-foreground italic p-6 text-center border border-dashed border-white/10 rounded-2xl">
              {readOnly ? "No coding platforms connected yet." : "No coding profiles connected yet. Connect your LeetCode, Codeforces, CodeChef, or AtCoder handles above!"}
            </p>
          )}
        </div>
      </section>

      {/* ── Contest Rating Graphs ── */}
      {activeContestHistories.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-white/10 bg-card/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Trophy className="size-5 text-amber-400" />
            <h3 className="text-base font-bold text-foreground">Contest Rating Progression</h3>
          </div>
          <div className="space-y-4">
            {activeContestHistories.map((item) => (
              <ContestHistoryChart
                key={item.platform}
                platformName={item.platform}
                history={item.history}
                color={item.color}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
