"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { todayIso, DEFAULT_DAILY_COUNTS, type DailyCounts } from "@/lib/plan";
import { Loader2, BookOpen, Zap, Trophy, CalendarDays, Sliders, X } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onComplete: (startDate: string, counts: DailyCounts) => Promise<void>;
  onClose?: () => void;
}

const STEPS = ["welcome", "pace", "startdate", "ready"] as const;
type Step = typeof STEPS[number];

export function OnboardingModal({ open, onComplete, onClose }: OnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [counts, setCounts] = useState<DailyCounts>({ ...DEFAULT_DAILY_COUNTS });
  const [startDate, setStartDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push("/");
    }
  };

  const setCount = (key: keyof DailyCounts, val: number) =>
    setCounts((prev) => ({ ...prev, [key]: val }));

  const handleFinish = async () => {
    setBusy(true);
    try {
      await onComplete(startDate, counts);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleClose();
        }}
      >
        {/* Top-right close button to redirect to landing page */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3.5 top-3.5 z-50 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          aria-label="Close and return to home"
        >
          <X className="size-4" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 px-5 sm:px-6 pt-5 pr-12 shrink-0">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                STEPS.indexOf(step) >= i ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-6 pt-4 space-y-4">
          {/* ── Step 1: Welcome ── */}
          {step === "welcome" && (
            <div className="space-y-4">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl sm:text-2xl font-bold">Welcome to DSA⁴⁰⁴! 🚀</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  Let's set up your personalised DSA preparation plan. It only takes a minute.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                <div className="rounded-xl border border-border bg-emerald-50 dark:bg-emerald-900/20 p-2.5 sm:p-3 text-center">
                  <BookOpen className="mx-auto mb-1 size-4 sm:size-5 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400">Level 1</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Foundations</p>
                </div>
                <div className="rounded-xl border border-border bg-blue-50 dark:bg-blue-900/20 p-2.5 sm:p-3 text-center">
                  <Zap className="mx-auto mb-1 size-4 sm:size-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-[11px] sm:text-xs font-semibold text-blue-700 dark:text-blue-400">Level 2</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Intermediate</p>
                </div>
                <div className="rounded-xl border border-border bg-purple-50 dark:bg-purple-900/20 p-2.5 sm:p-3 text-center">
                  <Trophy className="mx-auto mb-1 size-4 sm:size-5 text-purple-600 dark:text-purple-400" />
                  <p className="text-[11px] sm:text-xs font-semibold text-purple-700 dark:text-purple-400">Level 3</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Advanced</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                338 curated problems across 42 topics — organised in 3 levels to take you from fundamentals to advanced DSA.
              </p>

              <Button className="w-full h-10 sm:h-11 cursor-pointer text-sm sm:text-base font-semibold" onClick={() => setStep("pace")}>
                Let's Get Started →
              </Button>
            </div>
          )}

          {/* ── Step 2: Daily Pace ── */}
          {step === "pace" && (
            <div className="space-y-4 sm:space-y-5">
              <DialogHeader className="text-left">
                <div className="flex items-center gap-2 mb-0.5">
                  <Sliders className="size-4 sm:size-5 text-primary" />
                  <DialogTitle className="text-lg sm:text-xl">Set Your Daily Pace</DialogTitle>
                </div>
                <DialogDescription className="text-xs sm:text-sm">
                  How many problems can you solve per day? This controls how the plan distributes your workload.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Easy */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <span className="inline-block size-2 rounded-full bg-green-500" />
                      Easy problems / day
                    </Label>
                    <span className="w-6 text-center font-bold text-green-600 tabular-nums">{counts.easy}</span>
                  </div>
                  <Slider
                    min={1} max={10} step={1}
                    value={[counts.easy]}
                    onValueChange={([v]) => setCount("easy", v)}
                    className="[&>[role=slider]]:bg-green-500 py-1"
                  />
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Max {counts.easy} Easy problems/day (~{counts.easy * 15} min at 15m/easy)</p>
                </div>

                {/* Medium */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <span className="inline-block size-2 rounded-full bg-yellow-500" />
                      Medium pace limit / day
                    </Label>
                    <span className="w-6 text-center font-bold text-yellow-600 tabular-nums">{counts.medium}</span>
                  </div>
                  <Slider
                    min={1} max={8} step={1}
                    value={[counts.medium]}
                    onValueChange={([v]) => setCount("medium", v)}
                    className="[&>[role=slider]]:bg-yellow-500 py-1"
                  />
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Max {counts.medium} Medium problems/day (~{counts.medium * 30} min at 30m/medium)</p>
                </div>

                {/* Hard */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <span className="inline-block size-2 rounded-full bg-red-500" />
                      Hard pace limit / day
                    </Label>
                    <span className="w-6 text-center font-bold text-red-600 tabular-nums">{counts.hard}</span>
                  </div>
                  <Slider
                    min={1} max={5} step={1}
                    value={[counts.hard]}
                    onValueChange={([v]) => setCount("hard", v)}
                    className="[&>[role=slider]]:bg-red-500 py-1"
                  />
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Max {counts.hard} Hard problems/day (~{counts.hard * 45} min at 45m/hard)</p>
                </div>
              </div>

              {/* Daily time estimate */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 sm:px-4 sm:py-3">
                <p className="text-xs sm:text-sm font-semibold text-primary">
                  Dynamic daily study time: ~{Math.min(counts.easy * 15, counts.medium * 30, counts.hard * 45)} to {Math.max(counts.easy * 15, counts.medium * 30, counts.hard * 45)} min / day
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  Workload is calculated dynamically based on problem difficulty. Leftover problems overflow to next day.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 cursor-pointer h-10" onClick={() => setStep("welcome")}>Back</Button>
                <Button className="flex-1 cursor-pointer h-10" onClick={() => setStep("startdate")}>Next →</Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Start Date ── */}
          {step === "startdate" && (
            <div className="space-y-4 sm:space-y-5">
              <DialogHeader className="text-left">
                <div className="flex items-center gap-2 mb-0.5">
                  <CalendarDays className="size-4 sm:size-5 text-primary" />
                  <DialogTitle className="text-lg sm:text-xl">When do you start?</DialogTitle>
                </div>
                <DialogDescription className="text-xs sm:text-sm">
                  Pick the date your preparation journey begins. Day 1 will be assigned to this date.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs sm:text-sm">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  min={todayIso()}
                  onChange={(e) => setStartDate(e.target.value || todayIso())}
                  className="text-sm sm:text-base h-10"
                />
              </div>

              <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 sm:px-4 space-y-1.5">
                <p className="text-xs sm:text-sm font-semibold">Your plan summary</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">📅 Starting: {new Date(`${startDate}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">⚡ Daily pace: {counts.easy} Easy · {counts.medium} Medium · {counts.hard} Hard</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">⏱ Study time: ~{Math.min(counts.easy * 15, counts.medium * 30, counts.hard * 45)} – {Math.max(counts.easy * 15, counts.medium * 30, counts.hard * 45)} min/day</p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 cursor-pointer h-10" onClick={() => setStep("pace")}>Back</Button>
                <Button className="flex-1 cursor-pointer h-10" onClick={() => setStep("ready")}>Next →</Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Ready ── */}
          {step === "ready" && (
            <div className="space-y-4 sm:space-y-5">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl sm:text-2xl font-bold">You're all set! 🎉</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  Your personalised DSA plan is ready to build. Here's what we've configured:
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <CalendarDays className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Start Date</p>
                    <p className="text-xs sm:text-sm font-semibold truncate">
                      {new Date(`${startDate}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <Sliders className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Daily Pace Limits</p>
                    <p className="text-xs sm:text-sm font-semibold truncate">
                      {counts.easy} Easy · {counts.medium} Medium · {counts.hard} Hard
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <span className="text-sm sm:text-base">⏱</span>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Daily Study Time</p>
                    <p className="text-xs sm:text-sm font-semibold truncate">~{Math.min(counts.easy * 15, counts.medium * 30, counts.hard * 45)} to {Math.max(counts.easy * 15, counts.medium * 30, counts.hard * 45)} min / day</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-muted-foreground">
                You can always change your pace and schedule in Settings.
              </p>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 cursor-pointer h-10 sm:h-11" onClick={() => setStep("startdate")}>Back</Button>
                <Button className="flex-[2] text-sm sm:text-base h-10 sm:h-11 cursor-pointer font-semibold" onClick={handleFinish} disabled={busy}>
                  {busy ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Building plan…</>
                  ) : (
                    "Start My DSA Journey 🚀"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}