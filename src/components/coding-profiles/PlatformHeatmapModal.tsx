"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, subDays, eachDayOfInterval, getMonth, getYear, startOfWeek, addDays, parseISO } from "date-fns";
import { Flame, Calendar, Sparkles, ExternalLink, Trophy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformHeatmapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformName: string;
  username: string;
  profileUrl?: string | null;
  submissionCalendar?: Record<string, number> | string | null;
  recentSubmissions?: Array<{ timestamp?: string | number; date?: string; problemName?: string; verdict?: string }> | null;
  ratingHistory?: Array<{ timestamp?: number; date?: string; contestName?: string; rating?: number }> | null;
  totalSolved?: number | null;
  color?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

export function PlatformHeatmapModal({
  open,
  onOpenChange,
  platformName,
  username,
  profileUrl,
  submissionCalendar,
  recentSubmissions,
  ratingHistory,
  totalSolved,
  color = "#22c55e",
}: PlatformHeatmapModalProps) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; count: number } | null>(null);

  // Helper to normalize any date/timestamp into "YYYY-MM-DD"
  const normalizeDateKey = (key: string | number): string | null => {
    if (key === undefined || key === null) return null;
    const str = String(key).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const num = Number(str);
    if (!isNaN(num) && num > 0) {
      const ms = num < 1e11 ? num * 1000 : num;
      try {
        const d = new Date(ms);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      } catch {}
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch {}

    return null;
  };

  // Build unified calendar map
  const { dateCountMap, totalActiveDays, totalSubmissionsCount, weeks, months } = useMemo(() => {
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

    // Trailing 52 weeks (~364 days / 1 full year)
    const today = new Date();
    const startDate = subDays(today, 363);
    const firstWeekMonday = startOfWeek(startDate, { weekStartsOn: 1 });

    let activeDays = 0;
    let computedSubmissions = 0;

    map.forEach((cnt) => {
      if (cnt > 0) {
        activeDays++;
        computedSubmissions += cnt;
      }
    });

    const displayTotal = totalSolved && totalSolved > computedSubmissions ? totalSolved : computedSubmissions;

    // Generate 52-53 weeks
    let curr = firstWeekMonday;
    const weeksList: { dateStr: string; dayIndex: number; month: number }[][] = [];
    const monthHeaders: { name: string; weekIndex: number }[] = [];

    let lastMonth = -1;
    let weekIdx = 0;

    while (curr <= today || weeksList.length < 52) {
      const week: { dateStr: string; dayIndex: number; month: number }[] = [];
      const m = getMonth(curr);

      if (m !== lastMonth) {
        monthHeaders.push({ name: MONTH_NAMES[m], weekIndex: weekIdx });
        lastMonth = m;
      }

      for (let day = 0; day < 7; day++) {
        const dateStr = format(curr, "yyyy-MM-dd");
        week.push({ dateStr, dayIndex: day, month: getMonth(curr) });
        curr = addDays(curr, 1);
      }

      weeksList.push(week);
      weekIdx++;
    }

    return {
      dateCountMap: map,
      totalActiveDays: activeDays,
      totalSubmissionsCount: displayTotal,
      weeks: weeksList,
      months: monthHeaders,
    };
  }, [submissionCalendar, recentSubmissions, ratingHistory, totalSolved]);

  const getIntensity = (count: number): number => {
    if (!count || count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const activeDisplay = hoveredDay || selectedDay;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-4xl p-6 rounded-3xl bg-card/95 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-5">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-2xl border border-white/15 shadow-sm"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <Flame className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  <span>{platformName} Activity Heatmap</span>
                  {profileUrl && (
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-mono font-medium inline-flex items-center gap-1"
                    >
                      @{username} <ExternalLink className="size-3" />
                    </a>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">Full 12-month submission activity & consistency record</p>
              </div>
            </div>

            {/* Quick Badges */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 py-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Submissions</span>
                <span className="font-black text-sm text-foreground tabular-nums">{totalSubmissionsCount}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                <span className="text-[10px] uppercase font-bold">Active Days</span>
                <span className="font-black text-sm tabular-nums">{totalActiveDays}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Heatmap Grid Section */}
        <div className="space-y-3 rounded-2xl border border-border bg-background/50 p-4">
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
            <div className="min-w-[700px]">
              {/* Month Headers */}
              <div className="flex text-[10px] text-muted-foreground font-medium mb-1.5 pl-8">
                {months.map((m, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${(100 / weeks.length) * (idx === months.length - 1 ? 4 : (months[idx + 1]?.weekIndex ?? weeks.length) - m.weekIndex)}%` }}
                    className="truncate"
                  >
                    {m.name}
                  </div>
                ))}
              </div>

              {/* Grid with Day Labels */}
              <div className="flex items-start gap-1">
                {/* Day Labels Column */}
                <div className="flex flex-col gap-1 pr-1.5 text-[9px] font-mono text-muted-foreground select-none">
                  {DAY_LABELS.map((lbl, idx) => (
                    <div key={idx} className="h-3 leading-3 flex items-center">
                      {lbl}
                    </div>
                  ))}
                </div>

                {/* Weeks Grid */}
                <div className="flex gap-1 flex-1">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                      {week.map((day) => {
                        const count = dateCountMap.get(day.dateStr) || 0;
                        const level = getIntensity(count);

                        let bgStyle = "rgba(255, 255, 255, 0.05)";
                        if (level === 1) bgStyle = `${color}40`;
                        if (level === 2) bgStyle = `${color}75`;
                        if (level === 3) bgStyle = `${color}B0`;
                        if (level === 4) bgStyle = color;

                        const isSelected = selectedDay?.date === day.dateStr;

                        return (
                          <div
                            key={day.dateStr}
                            onClick={() => setSelectedDay({ date: day.dateStr, count })}
                            onMouseEnter={() => setHoveredDay({ date: day.dateStr, count })}
                            onMouseLeave={() => setHoveredDay(null)}
                            className={cn(
                              "size-3 rounded-[3px] transition-all cursor-pointer border border-transparent hover:scale-125 hover:border-white hover:z-10",
                              level === 0 && "hover:bg-white/20",
                              isSelected && "ring-2 ring-white border-white scale-125 z-10"
                            )}
                            style={{ backgroundColor: bgStyle }}
                            title={`${count} submissions on ${day.dateStr}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
            <div className="min-h-[22px] flex items-center">
              {activeDisplay ? (
                <div className="flex items-center gap-2 font-medium text-foreground animate-fade-in">
                  <Calendar className="size-3.5 text-primary" />
                  <span>
                    <strong className="text-primary font-bold text-sm">{activeDisplay.count}</strong> {activeDisplay.count === 1 ? "submission" : "submissions"} on {activeDisplay.date}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">
                  Hover or click on any square to view day submission details
                </span>
              )}
            </div>

            {/* Intensity Legend */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <span className="text-[10px]">Less</span>
              <div className="size-2.5 rounded-[2px] bg-white/10" />
              <div className="size-2.5 rounded-[2px]" style={{ backgroundColor: `${color}40` }} />
              <div className="size-2.5 rounded-[2px]" style={{ backgroundColor: `${color}75` }} />
              <div className="size-2.5 rounded-[2px]" style={{ backgroundColor: `${color}B0` }} />
              <div className="size-2.5 rounded-[2px]" style={{ backgroundColor: color }} />
              <span className="text-[10px]">More</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
