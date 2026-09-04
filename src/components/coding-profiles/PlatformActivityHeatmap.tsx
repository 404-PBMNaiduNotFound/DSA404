"use client";

import React, { useMemo, useState } from "react";
import { format, subDays, startOfWeek, addDays, getMonth } from "date-fns";
import { Flame, Calendar, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface PlatformActivityHeatmapProps {
  submissionCalendar?: Record<string, number> | string | null;
  recentSubmissions?: Array<{ timestamp?: string | number; date?: string }> | null;
  ratingHistory?: Array<{ timestamp?: number; date?: string; contestName?: string }> | null;
  totalSolved?: number | null;
  color?: string;
  platformName: string;
}

export function PlatformActivityHeatmap({
  submissionCalendar,
  recentSubmissions,
  ratingHistory,
  totalSolved,
  color = "#22c55e",
  platformName,
}: PlatformActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  // Helper to normalize any timestamp / date string to "YYYY-MM-DD"
  const normalizeDateKey = (key: string | number): string | null => {
    if (key === undefined || key === null) return null;
    const str = String(key).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const num = Number(str);
    if (!isNaN(num) && num > 0) {
      const ms = num < 1e11 ? num * 1000 : num;
      try {
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          return format(d, "yyyy-MM-dd");
        }
      } catch {}
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return format(d, "yyyy-MM-dd");
      }
    } catch {}

    return null;
  };

  // Build unified date -> count map for the trailing 24 weeks (~168 days) aligned to Monday
  const { dateCountMap, totalActiveDays, totalSubmissionsCount, weeks } = useMemo(() => {
    const map = new Map<string, number>();

    // 1. Process submissionCalendar
    let rawCalendar = submissionCalendar;
    if (typeof rawCalendar === "string") {
      try {
        rawCalendar = JSON.parse(rawCalendar);
      } catch {
        rawCalendar = null;
      }
    }

    if (rawCalendar && typeof rawCalendar === "object") {
      for (const [key, count] of Object.entries(rawCalendar)) {
        const dateKey = normalizeDateKey(key);
        const cnt = Number(count);
        if (dateKey && !isNaN(cnt) && cnt > 0) {
          map.set(dateKey, (map.get(dateKey) || 0) + cnt);
        }
      }
    }

    // 2. Process recentSubmissions
    if (recentSubmissions && Array.isArray(recentSubmissions)) {
      recentSubmissions.forEach((sub) => {
        const val = sub.timestamp || sub.date;
        if (val) {
          const dateKey = normalizeDateKey(val);
          if (dateKey) {
            map.set(dateKey, (map.get(dateKey) || 0) + 1);
          }
        }
      });
    }

    // 3. Process ratingHistory
    if (ratingHistory && Array.isArray(ratingHistory)) {
      ratingHistory.forEach((contest) => {
        const val = contest.timestamp || contest.date;
        if (val) {
          const dateKey = normalizeDateKey(val);
          if (dateKey) {
            map.set(dateKey, (map.get(dateKey) || 0) + 1);
          }
        }
      });
    }

    // Trailing 24 weeks (~168 days) aligned to Monday
    const today = new Date();
    const startDate = subDays(today, 167);
    const firstMonday = startOfWeek(startDate, { weekStartsOn: 1 });

    let activeDays = 0;
    let computedSubmissions = 0;

    map.forEach((cnt) => {
      if (cnt > 0) {
        activeDays++;
        computedSubmissions += cnt;
      }
    });

    const displayTotal = totalSolved && totalSolved > computedSubmissions ? totalSolved : computedSubmissions;

    let curr = firstMonday;
    const weekCols: { dateStr: string; dayIndex: number; month: number; isFuture: boolean }[][] = [];

    while (curr <= today || weekCols.length < 24) {
      const week: { dateStr: string; dayIndex: number; month: number; isFuture: boolean }[] = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = format(curr, "yyyy-MM-dd");
        week.push({
          dateStr,
          dayIndex: day,
          month: getMonth(curr),
          isFuture: curr > today,
        });
        curr = addDays(curr, 1);
      }
      weekCols.push(week);
      if (weekCols.length >= 26) break;
    }

    return {
      dateCountMap: map,
      totalActiveDays: activeDays,
      totalSubmissionsCount: displayTotal,
      weeks: weekCols,
    };
  }, [submissionCalendar, recentSubmissions, ratingHistory, totalSolved]);

  const getIntensity = (count: number): number => {
    if (!count || count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const hasActivity = totalSubmissionsCount > 0 || totalActiveDays > 0;

  return (
    <div className="space-y-3">
      {/* Activity Summary Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Flame className="size-3.5 text-amber-500" />
          <span className="font-bold text-foreground">
            {totalSubmissionsCount} {totalSubmissionsCount === 1 ? "Submission" : "Submissions"}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{totalActiveDays} Active Days</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">Past 6 Months</span>
      </div>

      {/* Mini Heatmap Grid */}
      <div className="w-full overflow-x-auto pb-1 pt-1">
        <div className="flex flex-col gap-1 min-w-fit items-start sm:items-center">
          {/* Month headers row */}
          <div className="h-4 flex items-center gap-1 mb-1">
            {(() => {
              let lastRenderedWIdx = -10;
              return weeks.map((week, wIdx) => {
                const currMonth = week[0]?.month ?? 0;
                const prevMonth = wIdx > 0 ? (weeks[wIdx - 1]?.[0]?.month ?? -1) : -1;
                const isNewMonth = (currMonth !== prevMonth || wIdx === 0) && (wIdx - lastRenderedWIdx >= 3);
                if (isNewMonth) {
                  lastRenderedWIdx = wIdx;
                }

                return (
                  <div key={wIdx} className="w-2.5 sm:w-3 h-4 shrink-0 relative select-none">
                    {isNewMonth && (
                      <span className="absolute left-0 bottom-0 text-[9px] font-mono font-medium text-muted-foreground whitespace-nowrap select-none">
                        {MONTH_NAMES[currMonth]}
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {/* Week columns */}
          <div className="flex gap-1">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                {week.map((day) => {
                  const count = dateCountMap.get(day.dateStr) || 0;
                  const level = getIntensity(count);

                  return (
                    <div
                      key={day.dateStr}
                      onMouseEnter={() => setHoveredDay({ date: day.dateStr, count })}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={cn(
                        "size-2.5 sm:size-3 rounded-[3px] transition-all cursor-pointer",
                        level === 0 && "bg-muted/70 dark:bg-white/10 border border-border/50 dark:border-white/5 hover:bg-muted-foreground/20 hover:border-emerald-500/50",
                        level === 1 && "bg-emerald-500/30 dark:bg-emerald-600/35 border border-emerald-500/30 hover:scale-125 hover:border-white/60 hover:z-10 shadow-sm",
                        level === 2 && "bg-emerald-500/55 dark:bg-emerald-500/60 border border-emerald-500/40 hover:scale-125 hover:border-white/60 hover:z-10 shadow-sm",
                        level === 3 && "bg-emerald-500/80 dark:bg-emerald-500/85 border border-emerald-500/50 hover:scale-125 hover:border-white/60 hover:z-10 shadow-sm",
                        level === 4 && "bg-emerald-500 dark:bg-emerald-400 border border-emerald-400 hover:scale-125 hover:border-white/60 hover:z-10 shadow-sm",
                        day.isFuture && "opacity-20 pointer-events-none"
                      )}
                      title={`${day.dateStr}: ${count} submission${count === 1 ? "" : "s"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Status or Legend */}
      <div className="flex items-center justify-between text-[11px] min-h-[20px] pt-1 border-t border-white/10 text-muted-foreground">
        {hoveredDay ? (
          <span className="font-medium text-foreground truncate animate-fade-in">
            <strong className="text-emerald-400">{hoveredDay.count}</strong> {hoveredDay.count === 1 ? "submission" : "submissions"} on {(() => {
              try {
                const parts = hoveredDay.date.split("-");
                if (parts.length === 3) {
                  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  return format(d, "EEE, MMM d, yyyy");
                }
                return hoveredDay.date;
              } catch {
                return hoveredDay.date;
              }
            })()}
          </span>
        ) : (
          <span className="truncate">
            {hasActivity ? "Hover square for daily activity" : `No recent activity recorded for ${platformName}`}
          </span>
        )}

        {/* Intensity Legend */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px]">Less</span>
          <div className="size-2 rounded-[2px] bg-muted/70 dark:bg-white/10 border border-border/50 dark:border-white/5" />
          <div className="size-2 rounded-[2px] bg-emerald-500/30 dark:bg-emerald-600/35 border border-emerald-500/30" />
          <div className="size-2 rounded-[2px] bg-emerald-500/55 dark:bg-emerald-500/60 border border-emerald-500/40" />
          <div className="size-2 rounded-[2px] bg-emerald-500/80 dark:bg-emerald-500/85 border border-emerald-500/50" />
          <div className="size-2 rounded-[2px] bg-emerald-500 dark:bg-emerald-400 border border-emerald-400" />
          <span className="text-[10px]">More</span>
        </div>
      </div>
    </div>
  );
}
