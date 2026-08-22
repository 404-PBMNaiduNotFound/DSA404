"use client";

import { useMemo } from "react";
import { usePlan } from "@/hooks/usePlan";
import { useSettings } from "@/hooks/useSettings";
import { dayProgress, DEFAULT_DAILY_COUNTS } from "@/lib/plan";
import { CORE_SECTIONS } from "@/lib/master-problems";
import { DayCard } from "@/components/DayCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Ban, Undo2 } from "lucide-react";
import type { Day } from "@/lib/types";

function normalizeLevel(lvl?: string): "Level 1" | "Level 2" | "Level 3" {
  if (!lvl) return "Level 1";
  const s = lvl.toLowerCase();
  if (s.includes("3") || s.includes("advanced") || s.includes("hard")) return "Level 3";
  if (s.includes("2") || s.includes("intermediate") || s.includes("medium")) return "Level 2";
  return "Level 1";
}

/** How many problems of each difficulty appear in a day */
function diffCounts(day: Day) {
  const easy = day.problems.filter((p) => p.difficulty === "Easy").length;
  const medium = day.problems.filter((p) => p.difficulty === "Medium").length;
  const hard = day.problems.filter((p) => p.difficulty === "Hard").length;
  return { easy, medium, hard };
}

/** Whether a day's problems fit within user's daily limits */
function fitsInOneDay(day: Day, counts: { easy: number; medium: number; hard: number }) {
  const dc = diffCounts(day);
  return dc.easy <= counts.easy && dc.medium <= counts.medium && dc.hard <= counts.hard;
}

/** How many "days" this topic needs given the user's daily preference */
function daysRequired(days: Day[], counts: { easy: number; medium: number; hard: number }) {
  let totalEasy = 0, totalMed = 0, totalHard = 0;
  days.forEach((d) => {
    const dc = diffCounts(d);
    totalEasy += dc.easy;
    totalMed += dc.medium;
    totalHard += dc.hard;
  });
  const easyDays = counts.easy > 0 ? Math.ceil(totalEasy / counts.easy) : (totalEasy > 0 ? Infinity : 0);
  const medDays = counts.medium > 0 ? Math.ceil(totalMed / counts.medium) : (totalMed > 0 ? Infinity : 0);
  const hardDays = counts.hard > 0 ? Math.ceil(totalHard / counts.hard) : (totalHard > 0 ? Infinity : 0);
  return Math.max(easyDays, medDays, hardDays, 1);
}

export default function TopicsPage() {
  const { days, loading, skipSection, skipTopic } = usePlan();
  const { settings } = useSettings();
  const counts = settings?.counts ?? DEFAULT_DAILY_COUNTS;

  // Group days by Topic in 28 Dependency-Aware Topic Order (1..28)
  const topicsList = useMemo(() => {
    const orderedTopicNames = CORE_SECTIONS.map((s) => s.topic);
    const sectionDaysMap = new Map<string, Day[]>();

    days.filter((d) => !d.isRevisionDay).forEach((d) => {
      const existing = sectionDaysMap.get(d.section) ?? [];
      existing.push(d);
      sectionDaysMap.set(d.section, existing);
    });

    return orderedTopicNames.map((topicName, idx) => {
      const topicDays = sectionDaysMap.get(topicName) ?? [];
      const active = topicDays.filter((d) => !d.skipped);
      const done = active.reduce((a, d) => a + dayProgress(d).done, 0);
      const total = active.reduce((a, d) => a + dayProgress(d).total, 0);
      const allSkipped = topicDays.length > 0 && topicDays.every((d) => d.skipped);
      const needed = daysRequired(active, counts);

      const levelCounts = active.reduce(
        (acc, d) => {
          d.problems.forEach((p) => {
            const lvl = normalizeLevel(p.level ?? d.level);
            if (lvl === "Level 1") acc.l1++;
            else if (lvl === "Level 2") acc.l2++;
            else if (lvl === "Level 3") acc.l3++;
          });
          return acc;
        },
        { l1: 0, l2: 0, l3: 0 }
      );

      const dc = active.reduce(
        (acc, d) => {
          const c = diffCounts(d);
          return { easy: acc.easy + c.easy, medium: acc.medium + c.medium, hard: acc.hard + c.hard };
        },
        { easy: 0, medium: 0, hard: 0 }
      );

      const coreSec = CORE_SECTIONS.find((s) => s.topic === topicName);

      return {
        topicNo: idx + 1,
        section: topicName,
        subtopics: coreSec?.subtopics ?? [],
        list: active,
        done,
        total,
        pct: total ? Math.round((done / total) * 100) : 0,
        allSkipped,
        daysNeeded: needed,
        diffCounts: dc,
        levelCounts,
      };
    }).filter((s) => s.total > 0 || s.allSkipped);
  }, [days, counts]);

  const skippedDays = useMemo(
    () => days.filter((d) => d.skipped).sort((a, b) => a.dayNumber - b.dayNumber),
    [days],
  );

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <>
      {/* Header */}
      <div className="mb-4 border-b border-border pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Topic View</h1>
        <p className="text-sm text-muted-foreground">
          Dependency-aware vertical learning sequence (28 Major Topics). Daily capacity:{" "}
          <span className="font-medium text-foreground">{counts.easy}E · {counts.medium}M · {counts.hard}H</span>
        </p>
      </div>

      {/* Vertical Topic Order (1..28) */}
      <Accordion type="multiple" defaultValue={topicsList.slice(0, 3).map((t) => t.section)} className="space-y-3">
        {topicsList.map((s) => (
          <AccordionItem
            key={s.section}
            value={s.section}
            className="rounded-2xl border-2 border-border bg-card/50 px-4 overflow-hidden"
          >
            {/* Topic header */}
            <div className="flex w-full flex-wrap items-center justify-between gap-2 pt-2 pb-1">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono">
                  Topic {String(s.topicNo).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <AccordionTrigger className="hover:no-underline py-1 text-left">
                    <span className="font-display text-sm sm:text-base md:text-lg font-bold break-words">
                      {s.section}
                    </span>
                  </AccordionTrigger>
                </div>
              </div>

              {/* Progress count & Skip button */}
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium tabular-nums whitespace-nowrap">
                  {s.done}/{s.total} problems
                </span>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    void skipSection(s.section, !s.allSkipped);
                  }}
                >
                  {s.allSkipped ? (
                    <><Undo2 className="size-3" aria-hidden="true" /> Un-skip</>
                  ) : (
                    <><Ban className="size-3" aria-hidden="true" /> Skip</>
                  )}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="pb-3 pt-0">
              <Progress value={s.pct} className="h-1.5" />
            </div>

            <AccordionContent>
              {s.list.length === 0 ? (
                <p className="pb-4 text-sm text-muted-foreground">
                  Every day in this topic is skipped.
                </p>
              ) : (
                <>
                  {/* Topic subtopics & capacity hint */}
                  <div className="mb-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    {s.subtopics.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Patterns:</span>
                        {s.subtopics.join(" · ")}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Daily capacity:</span> {counts.easy}E · {counts.medium}M · {counts.hard}H
                      {" · "}<span className="font-medium text-foreground">Est. {s.daysNeeded} day{s.daysNeeded === 1 ? "" : "s"}</span>
                    </p>
                  </div>

                  {/* Day cards */}
                  <div className="grid gap-3 pb-2 sm:grid-cols-2">
                    {s.list.map((d) => {
                      const dc = diffCounts(d);
                      const fits = fitsInOneDay(d, counts);
                      return (
                        <div key={d.dayNumber} className="relative">
                          {!fits && (
                            <div className="absolute -top-1 -right-1 z-10">
                              <span className="rounded-full bg-warning/90 px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground">
                                Exceeds limit
                              </span>
                            </div>
                          )}
                          <DayCard day={d} showSkipAction />
                          {/* Difficulty breakdown */}
                          <div className="mt-1 flex gap-1.5 px-1">
                            {dc.easy > 0 && (
                              <span className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${dc.easy > counts.easy ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                                {dc.easy}/{counts.easy} E
                              </span>
                            )}
                            {dc.medium > 0 && (
                              <span className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${dc.medium > counts.medium ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                                {dc.medium}/{counts.medium} M
                              </span>
                            )}
                            {dc.hard > 0 && (
                              <span className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${dc.hard > counts.hard ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"}`}>
                                {dc.hard}/{counts.hard} H
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Skipped days */}
      {skippedDays.length > 0 && (
        <div className="mt-4">
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem
              value="__skipped__"
              className="rounded-xl border border-dashed border-border bg-card/60 px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-baseline justify-between gap-3 text-left">
                  <span className="font-display font-semibold text-muted-foreground">Skipped Topics</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {skippedDays.length} day{skippedDays.length === 1 ? "" : "s"}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 pb-2 sm:grid-cols-2">
                  {skippedDays.map((d) => {
                    const { done, total } = dayProgress(d);
                    return (
                      <div
                        key={d.id}
                        className="rounded-lg border border-dashed border-border bg-secondary/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.section}</p>
                            <h4 className="mt-0.5 truncate text-sm font-semibold">{d.topic}</h4>
                          </div>
                          {total > 0 && (
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {done}/{total}
                            </span>
                          )}
                        </div>
                        {d.subtopics.length > 0 && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {d.subtopics.join(" · ")}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-7 px-2 text-xs"
                          onClick={() => void skipTopic(d.dayNumber, false)}
                        >
                          <Undo2 className="mr-1 size-3" aria-hidden="true" /> Un-skip
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </>
  );
}
