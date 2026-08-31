"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, subDays, getMonth, getYear, startOfWeek, addDays } from "date-fns";
import { Flame, Calendar, ExternalLink, CheckCircle2, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

type ViewRange = "3m" | "6m" | "1y";

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
  const [viewRange, setViewRange] = useState<ViewRange>("1y");
  const [sliderIndex, setSliderIndex] = useState<number>(0);
  const isMobileInitialRef = useRef(false);

  // Initialize mobile detection on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 640;
      if (isMobile && !isMobileInitialRef.current) {
        setViewRange("3m");
        isMobileInitialRef.current = true;
      }
    }
  }, []);

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
        if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
      } catch {}
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
    } catch {}

    return null;
  };

  // Build unified calendar map
  const { dateCountMap, totalActiveDays, totalSubmissionsCount, allWeeks, allMonths } = useMemo(() => {
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

    // Trailing 52 weeks (~364 days / 1 full year) aligned to Monday
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

    // Generate weeks
    let curr = firstWeekMonday;
    const weeksList: { dateStr: string; dayIndex: number; month: number; isFuture: boolean }[][] = [];
    const monthHeaders: { name: string; weekIndex: number; year: number }[] = [];

    let lastMonth = -1;
    let weekIdx = 0;

    while (curr <= today || weeksList.length < 52) {
      const week: { dateStr: string; dayIndex: number; month: number; isFuture: boolean }[] = [];
      const m = getMonth(curr);
      const y = getYear(curr);

      if (m !== lastMonth) {
        monthHeaders.push({ name: MONTH_NAMES[m], weekIndex: weekIdx, year: y });
        lastMonth = m;
      }

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

      weeksList.push(week);
      weekIdx++;
      if (weeksList.length >= 60) break;
    }

    return {
      dateCountMap: map,
      totalActiveDays: activeDays,
      totalSubmissionsCount: displayTotal,
      allWeeks: weeksList,
      allMonths: monthHeaders,
    };
  }, [submissionCalendar, recentSubmissions, ratingHistory, totalSolved]);

  // Determine number of weeks visible per view mode
  const visibleWeeksCount = useMemo(() => {
    if (viewRange === "3m") return 13; // 13 weeks = 3 months
    if (viewRange === "6m") return 26; // 26 weeks = 6 months
    return allWeeks.length; // 1y (all 52 weeks)
  }, [viewRange, allWeeks.length]);

  const maxSliderIndex = useMemo(() => {
    return Math.max(0, allWeeks.length - visibleWeeksCount);
  }, [allWeeks.length, visibleWeeksCount]);

  // Adjust sliderIndex if out of bounds on range change
  useEffect(() => {
    if (sliderIndex > maxSliderIndex) {
      setSliderIndex(maxSliderIndex);
    }
  }, [maxSliderIndex, sliderIndex]);

  // Set default slider position to the most recent period (end of the list) when switching to 3m or 6m
  const handleRangeChange = (range: ViewRange) => {
    setViewRange(range);
    if (range === "3m") {
      setSliderIndex(Math.max(0, allWeeks.length - 13));
    } else if (range === "6m") {
      setSliderIndex(Math.max(0, allWeeks.length - 26));
    } else {
      setSliderIndex(0);
    }
  };

  // Slice visible weeks based on slide bar offset
  const displayedWeeks = useMemo(() => {
    if (viewRange === "1y") return allWeeks;
    const start = Math.min(sliderIndex, maxSliderIndex);
    return allWeeks.slice(start, start + visibleWeeksCount);
  }, [allWeeks, sliderIndex, maxSliderIndex, visibleWeeksCount, viewRange]);

  // Start week index in overall timeline
  const currentStartWeekIdx = useMemo(() => {
    if (viewRange === "1y") return 0;
    return Math.min(sliderIndex, maxSliderIndex);
  }, [viewRange, sliderIndex, maxSliderIndex]);

  // Current visible date range display string
  const visibleDateRangeLabel = useMemo(() => {
    if (displayedWeeks.length === 0) return "";
    const firstWeek = displayedWeeks[0];
    const lastWeek = displayedWeeks[displayedWeeks.length - 1];
    const firstDate = firstWeek[0]?.dateStr;
    const lastDate = lastWeek[lastWeek.length - 1]?.dateStr;
    if (!firstDate || !lastDate) return "";
    try {
      const d1 = new Date(firstDate);
      const d2 = new Date(lastDate);
      return `${MONTH_NAMES[d1.getMonth()]} ${d1.getDate()}, ${d1.getFullYear()} – ${MONTH_NAMES[d2.getMonth()]} ${d2.getDate()}, ${d2.getFullYear()}`;
    } catch {
      return "";
    }
  }, [displayedWeeks]);

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
      <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-3xl bg-card/95 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-4">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 sm:pb-4">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div
                className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 shadow-sm"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <Flame className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xs sm:text-base font-extrabold tracking-tight text-foreground flex flex-wrap items-center gap-1.5">
                  <span className="truncate">{platformName} Activity Heatmap</span>
                  {profileUrl && (
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] sm:text-xs text-primary hover:underline font-mono font-medium inline-flex items-center gap-1 shrink-0"
                    >
                      @{username} <ExternalLink className="size-3" />
                    </a>
                  )}
                </DialogTitle>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  Daily submission activity & consistency record
                </p>
              </div>
            </div>

            {/* Quick Badges - XS text size default on mobile */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-2.5 py-1 sm:px-3 sm:py-1.5">
                <span className="text-[10px] sm:text-[11px] uppercase font-bold text-muted-foreground">Solved</span>
                <span className="font-black text-xs sm:text-sm text-foreground tabular-nums">{totalSubmissionsCount}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 sm:px-3 sm:py-1.5 text-emerald-400">
                <CheckCircle2 className="size-3 sm:size-3.5" />
                <span className="text-[10px] sm:text-[11px] uppercase font-bold">Active</span>
                <span className="font-black text-xs sm:text-sm tabular-nums">{totalActiveDays}d</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── Duration Selector & Mobile Slide Bar Controls ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 text-xs">
          {/* Duration Pills: 3m (default on mobile), 6m, 1y */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-background/60 p-1">
            <button
              type="button"
              onClick={() => handleRangeChange("3m")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                viewRange === "3m"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              3 Months
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange("6m")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                viewRange === "6m"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              6 Months
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange("1y")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                viewRange === "1y"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              1 Year (All)
            </button>
          </div>

          {/* Current visible month range label */}
          {visibleDateRangeLabel && (
            <div className="text-[11px] sm:text-xs font-mono font-medium text-muted-foreground">
              {visibleDateRangeLabel}
            </div>
          )}
        </div>

        {/* ── Slide Bar / Slider Control for 3-Month / 6-Month Navigation ── */}
        {viewRange !== "1y" && maxSliderIndex > 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/40 px-3 py-2 text-xs">
            <Button
              variant="outline"
              size="icon"
              className="size-7 rounded-lg shrink-0 border-white/10"
              onClick={() => setSliderIndex((prev) => Math.max(0, prev - 4))}
              disabled={sliderIndex <= 0}
              title="Slide back (1 month earlier)"
            >
              <ChevronLeft className="size-3.5" />
            </Button>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <SlidersHorizontal className="size-3.5 text-primary shrink-0" />
              <input
                type="range"
                min={0}
                max={maxSliderIndex}
                value={sliderIndex}
                onChange={(e) => setSliderIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                title="Slide to move heatmap time window"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-7 rounded-lg shrink-0 border-white/10"
              onClick={() => setSliderIndex((prev) => Math.min(maxSliderIndex, prev + 4))}
              disabled={sliderIndex >= maxSliderIndex}
              title="Slide forward (1 month later)"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}

        {/* ── Heatmap Grid Section (Fixed inside popup box, never overflowing) ── */}
        <div className="w-full max-w-full overflow-hidden rounded-2xl border border-border bg-background/50 p-3 sm:p-4 space-y-3">
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
            <div className="inline-block min-w-fit">
              {/* Month Headers Row - Pixel-aligned above each week column */}
              <div className="h-5 flex items-center gap-1 mb-1">
                {/* Spacer matching Day Labels Column */}
                <div className="w-5 sm:w-6 shrink-0 select-none" />

                {/* Month labels aligned with week columns */}
                {(() => {
                  let lastRenderedWIdx = -10;
                  return displayedWeeks.map((week, wIdx) => {
                    const currMonth = week[0]?.month ?? 0;
                    const prevMonth = wIdx > 0 ? (displayedWeeks[wIdx - 1]?.[0]?.month ?? -1) : (currentStartWeekIdx > 0 ? (allWeeks[currentStartWeekIdx - 1]?.[0]?.month ?? -1) : -1);
                    const isNewMonth = (currMonth !== prevMonth || wIdx === 0) && (wIdx - lastRenderedWIdx >= 3);
                    if (isNewMonth) {
                      lastRenderedWIdx = wIdx;
                    }

                    return (
                      <div
                        key={wIdx}
                        className="w-3 sm:w-3.5 h-5 shrink-0 relative select-none"
                      >
                        {isNewMonth && (
                          <span className="absolute left-0 bottom-0.5 text-[10px] sm:text-[11px] font-mono font-semibold text-muted-foreground whitespace-nowrap select-none">
                            {MONTH_NAMES[currMonth]}
                          </span>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Grid with Day Labels */}
              <div className="flex items-start gap-1">
                {/* Day Labels Column */}
                <div className="flex flex-col gap-1 pr-1 text-[9px] sm:text-[10px] font-mono text-muted-foreground select-none shrink-0 pt-0.5 w-5 sm:w-6">
                  {DAY_LABELS.map((lbl, idx) => (
                    <div key={idx} className="h-3 sm:h-3.5 leading-3 sm:leading-3.5 flex items-center">
                      {lbl}
                    </div>
                  ))}
                </div>

                {/* Weeks Grid */}
                <div className="flex gap-1">
                  {displayedWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                      {week.map((day) => {
                        const count = dateCountMap.get(day.dateStr) || 0;
                        const level = getIntensity(count);
                        const isSelected = selectedDay?.date === day.dateStr;

                        return (
                          <div
                            key={day.dateStr}
                            onClick={() => setSelectedDay({ date: day.dateStr, count })}
                            onMouseEnter={() => setHoveredDay({ date: day.dateStr, count })}
                            onMouseLeave={() => setHoveredDay(null)}
                            className={cn(
                              "size-3 sm:size-3.5 rounded-[3px] transition-all cursor-pointer",
                              level === 0 && "bg-muted/70 dark:bg-white/10 border border-border/50 dark:border-white/5 hover:bg-muted-foreground/20 hover:border-emerald-500/50",
                              level === 1 && "bg-emerald-500/30 dark:bg-emerald-600/35 border border-emerald-500/30 hover:scale-125 hover:border-white hover:z-10 shadow-sm",
                              level === 2 && "bg-emerald-500/55 dark:bg-emerald-500/60 border border-emerald-500/40 hover:scale-125 hover:border-white hover:z-10 shadow-sm",
                              level === 3 && "bg-emerald-500/80 dark:bg-emerald-500/85 border border-emerald-500/50 hover:scale-125 hover:border-white hover:z-10 shadow-sm",
                              level === 4 && "bg-emerald-500 dark:bg-emerald-400 border border-emerald-400 hover:scale-125 hover:border-white hover:z-10 shadow-sm",
                              isSelected && "ring-2 ring-white border-white scale-125 z-10",
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
          </div>

          {/* Footer Info & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
            <div className="min-h-[22px] flex items-center">
              {activeDisplay ? (
                <div className="flex items-center gap-2 font-medium text-foreground animate-fade-in text-xs">
                  <Calendar className="size-3.5 text-emerald-400 shrink-0" />
                  <span>
                    <strong className="text-emerald-400 font-bold text-xs sm:text-sm">{activeDisplay.count}</strong>{" "}
                    {activeDisplay.count === 1 ? "submission" : "submissions"} on {(() => {
                      try {
                        const parts = activeDisplay.date.split("-");
                        if (parts.length === 3) {
                          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                          return format(d, "EEEE, MMMM d, yyyy");
                        }
                        return activeDisplay.date;
                      } catch {
                        return activeDisplay.date;
                      }
                    })()}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-[11px] sm:text-xs truncate">
                  Tap or hover any day block to inspect submissions
                </span>
              )}
            </div>

            {/* Intensity Legend */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto shrink-0">
              <span className="text-[10px] sm:text-[11px]">Less</span>
              <div className="size-2.5 sm:size-3 rounded-[2px] bg-muted/70 dark:bg-white/10 border border-border/50 dark:border-white/5" />
              <div className="size-2.5 sm:size-3 rounded-[2px] bg-emerald-500/30 dark:bg-emerald-600/35 border border-emerald-500/30" />
              <div className="size-2.5 sm:size-3 rounded-[2px] bg-emerald-500/55 dark:bg-emerald-500/60 border border-emerald-500/40" />
              <div className="size-2.5 sm:size-3 rounded-[2px] bg-emerald-500/80 dark:bg-emerald-500/85 border border-emerald-500/50" />
              <div className="size-2.5 sm:size-3 rounded-[2px] bg-emerald-500 dark:bg-emerald-400 border border-emerald-400" />
              <span className="text-[10px] sm:text-[11px]">More</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

