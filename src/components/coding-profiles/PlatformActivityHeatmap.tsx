"use client";

import React, { useMemo, useState } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { Flame, Calendar, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

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
          return d.toISOString().slice(0, 10);
        }
      } catch {}
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch {}

    return null;
  };

  // Build unified date -> count map for the trailing ~168 days (24 weeks) or all activity
  const { dateCountMap, totalActiveDays, totalSubmissionsCount, daysArray } = useMemo(() => {
    const map = new Map<string, number>();

    // 1. Process submissionCalendar (can be object with unix seconds, ms, or YYYY-MM-DD keys, or JSON string)
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

    // 3. Process ratingHistory (contest participation days)
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

    // Trailing 24 weeks (~168 days)
    const today = new Date();
    const startDate = subDays(today, 167);
    const allDays = eachDayOfInterval({ start: startDate, end: today });

    let activeDays = 0;
    let computedSubmissions = 0;

    map.forEach((cnt) => {
      if (cnt > 0) {
        activeDays++;
        computedSubmissions += cnt;
      }
    });

    // If totalSolved is higher, use totalSolved for total display metric
    const displayTotal = totalSolved && totalSolved > computedSubmissions ? totalSolved : computedSubmissions;

    return {
      dateCountMap: map,
      totalActiveDays: activeDays,
      totalSubmissionsCount: displayTotal,
      daysArray: allDays,
    };
  }, [submissionCalendar, recentSubmissions, ratingHistory, totalSolved]);

  // Group into columns of 7 days (weeks)
  const weeks = useMemo(() => {
    const w: Date[][] = [];
    let currentWeek: Date[] = [];

    daysArray.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === daysArray.length - 1) {
        w.push(currentWeek);
        currentWeek = [];
      }
    });
    return w;
  }, [daysArray]);

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
        <div className="flex gap-1 min-w-fit items-center justify-start sm:justify-center">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const count = dateCountMap.get(dateKey) || 0;
                const level = getIntensity(count);

                let bgStyle = "rgba(255, 255, 255, 0.06)";
                if (level === 1) bgStyle = `${color}40`;
                if (level === 2) bgStyle = `${color}75`;
                if (level === 3) bgStyle = `${color}B0`;
                if (level === 4) bgStyle = color;

                return (
                  <div
                    key={dateKey}
                    onMouseEnter={() => setHoveredDay({ date: dateKey, count })}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={cn(
                      "size-2.5 sm:size-3 rounded-[3px] transition-all cursor-pointer border border-transparent hover:scale-125 hover:border-white/60 hover:z-10",
                      level === 0 && "hover:bg-white/20"
                    )}
                    style={{ backgroundColor: bgStyle }}
                    title={`${count} submissions on ${dateKey}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Status or Legend */}
      <div className="flex items-center justify-between text-[11px] min-h-[20px] pt-1 border-t border-white/10 text-muted-foreground">
        {hoveredDay ? (
          <span className="font-medium text-foreground truncate animate-fade-in">
            <strong className="text-primary">{hoveredDay.count}</strong> {hoveredDay.count === 1 ? "submission" : "submissions"} on {hoveredDay.date}
          </span>
        ) : (
          <span className="truncate">
            {hasActivity ? "Hover square for daily activity" : `No recent activity recorded for ${platformName}`}
          </span>
        )}

        {/* Intensity Legend */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px]">Less</span>
          <div className="size-2 rounded-[2px] bg-white/10" />
          <div className="size-2 rounded-[2px]" style={{ backgroundColor: `${color}40` }} />
          <div className="size-2 rounded-[2px]" style={{ backgroundColor: `${color}75` }} />
          <div className="size-2 rounded-[2px]" style={{ backgroundColor: `${color}B0` }} />
          <div className="size-2 rounded-[2px]" style={{ backgroundColor: color }} />
          <span className="text-[10px]">More</span>
        </div>
      </div>
    </div>
  );
}
