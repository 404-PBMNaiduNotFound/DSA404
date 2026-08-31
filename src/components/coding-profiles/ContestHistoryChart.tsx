"use client";

import React, { useState, useMemo } from "react";
import { RatingRecord } from "@/lib/coding-platforms/types";
import { Trophy, TrendingUp, TrendingDown, Calendar, Award, CheckCircle2, Sparkles, MousePointerClick } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

interface ContestHistoryChartProps {
  history: RatingRecord[] | null;
  platformName: string;
  color?: string;
}

export function ContestHistoryChart({ history, platformName, color = "#FFA116" }: ContestHistoryChartProps) {
  const [selectedNode, setSelectedNode] = useState<{
    contestName: string;
    rating: number;
    delta: number;
    date: string;
    rank?: number;
    contestNum: number;
  } | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground/60 italic rounded-3xl border border-dashed border-white/10 bg-background/20">
        <Trophy className="size-8 text-muted-foreground/30 mb-2" />
        <span>Contest history not available for {platformName}</span>
      </div>
    );
  }

  // Sorted chronology
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const timeA = a.timestamp ? (a.timestamp > 1e11 ? a.timestamp : a.timestamp * 1000) : new Date(a.date).getTime();
      const timeB = b.timestamp ? (b.timestamp > 1e11 ? b.timestamp : b.timestamp * 1000) : new Date(b.date).getTime();
      return timeA - timeB;
    });
  }, [history]);

  const ratings = useMemo(() => sortedHistory.map((h) => h.rating), [sortedHistory]);
  const minRaw = Math.min(...ratings);
  const maxRaw = Math.max(...ratings);
  const currentRating = sortedHistory[sortedHistory.length - 1]?.rating ?? 0;
  const initialRating = sortedHistory[0]?.rating ?? 0;
  const netDelta = currentRating - initialRating;

  // Format chart dataset
  const chartData = useMemo(() => {
    return sortedHistory.map((item, idx) => {
      const prevRating = idx > 0 ? sortedHistory[idx - 1].rating : item.rating;
      const delta = item.rating - prevRating;

      let shortDate = item.date;
      try {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          shortDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        }
      } catch {
        shortDate = item.date;
      }

      return {
        ...item,
        contestNum: idx + 1,
        rating: item.rating,
        delta,
        shortDate,
        fullDate: item.date,
      };
    });
  }, [sortedHistory]);

  const gradId = `contestFill-${platformName.replace(/\W+/g, "-")}`;

  return (
    <div className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm transition-all">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-7 items-center justify-center rounded-lg border border-white/10"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            <Trophy className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-foreground">{platformName} Rating History</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border"
                style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color }}
              >
                {sortedHistory.length} Contests
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MousePointerClick className="size-3 text-muted-foreground/80" />
              <span>Click on any node to view contest rating & rank details</span>
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Current</span>
            <span className="font-black tabular-nums text-sm text-foreground">{currentRating}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 shadow-sm text-amber-500">
            <Award className="size-3.5" />
            <span className="text-[10px] uppercase font-bold">Peak</span>
            <span className="font-black tabular-nums text-sm">{maxRaw}</span>
          </div>

          {netDelta !== 0 && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border",
                netDelta > 0
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400"
              )}
            >
              {netDelta > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              <span>{netDelta > 0 ? `+${netDelta}` : netDelta} overall</span>
            </div>
          )}
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="h-64 w-full rounded-2xl border border-border bg-background/50 p-3 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ left: -18, right: 12, top: 12, bottom: 0 }}
            onClick={(state) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const data = state.activePayload[0].payload;
                setSelectedNode({
                  contestName: data.contestName || `Contest #${data.contestNum}`,
                  rating: data.rating,
                  delta: data.delta,
                  date: data.fullDate || data.date,
                  rank: data.rank,
                  contestNum: data.contestNum,
                });
              }
            }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="60%" stopColor={color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />

            <XAxis
              dataKey="shortDate"
              minTickGap={35}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              stroke="var(--color-border)"
            />

            <YAxis
              allowDecimals={false}
              domain={[
                (dataMin: number) => Math.max(0, Math.floor((dataMin - 60) / 50) * 50),
                (dataMax: number) => Math.ceil((dataMax + 60) / 50) * 50,
              ]}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              stroke="var(--color-border)"
            />

            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-xl border border-white/20 bg-popover/95 p-3 text-xs shadow-2xl backdrop-blur-xl space-y-1 min-w-[200px] max-w-[280px]">
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-1.5">
                      <span className="font-extrabold text-popover-foreground line-clamp-1">
                        {data.contestName || `Contest #${data.contestNum}`}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                        #{data.contestNum}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-muted-foreground font-medium">Contest Rating:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black tabular-nums" style={{ color }}>
                          {data.rating}
                        </span>
                        {data.contestNum > 1 && (
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              data.delta > 0
                                ? "bg-emerald-500/15 text-emerald-400"
                                : data.delta < 0
                                ? "bg-rose-500/15 text-rose-400"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {data.delta > 0 ? `+${data.delta}` : data.delta}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-1 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>{data.fullDate || data.date}</span>
                      </div>
                      {data.rank ? (
                        <span className="font-mono font-bold text-foreground">Rank: #{data.rank.toLocaleString()}</span>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="rating"
              name={`${platformName} Rating`}
              stroke={color}
              fill={`url(#${gradId})`}
              strokeWidth={2.5}
              activeDot={{
                r: 6,
                stroke: "#ffffff",
                strokeWidth: 2,
                fill: color,
                onClick: (e: any, payload: any) => {
                  if (payload && payload.payload) {
                    const data = payload.payload;
                    setSelectedNode({
                      contestName: data.contestName || `Contest #${data.contestNum}`,
                      rating: data.rating,
                      delta: data.delta,
                      date: data.fullDate || data.date,
                      rank: data.rank,
                      contestNum: data.contestNum,
                    });
                  }
                },
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Selected Node Details Card (Shown on click) */}
      {selectedNode && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 backdrop-blur-md animate-fade-in flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex size-7 items-center justify-center rounded-lg shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-xs truncate">{selectedNode.contestName}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span>Contest #{selectedNode.contestNum}</span>
                <span>•</span>
                <span>{selectedNode.date}</span>
                {selectedNode.rank ? (
                  <>
                    <span>•</span>
                    <span className="font-mono font-semibold text-foreground">Rank #{selectedNode.rank.toLocaleString()}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 tabular-nums">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Rating</p>
              <p className="font-black text-sm" style={{ color }}>{selectedNode.rating}</p>
            </div>
            {selectedNode.contestNum > 1 && (
              <span
                className={cn(
                  "font-bold text-xs px-2 py-1 rounded-lg border",
                  selectedNode.delta > 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : selectedNode.delta < 0
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                {selectedNode.delta > 0 ? `+${selectedNode.delta}` : selectedNode.delta}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
