"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, db } from "@/integrations/firebase/client";
import { getCountFromServer, collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuoteLoader } from "@/components/QuoteLoader";
import { DemoShell } from "@/components/demo/DemoShell";
import { CORE_SECTIONS } from "@/lib/master-problems";
import { ALL_PROBLEMS } from "@/lib/problems";
import { seedDays, TOTAL_PROBLEMS } from "@/lib/plan";
import { getChatGPTAiPromptUrl } from "@/lib/aiTutorPrompt";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Code2,
  LayoutGrid,
  Sparkles,
  Trophy,
  Users,
  Search,
  ExternalLink,
  Zap,
  Bot,
  Laptop,
} from "lucide-react";
import { InstallApkSection } from "@/components/InstallApkSection";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { ChromeInstallModal } from "@/components/ChromeInstallModal";

function ChromeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="21.17" y1="8" x2="12" y2="8" />
      <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
      <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

/* ─── real, derived homepage stats (single source of truth) ─── */
const REAL_SECTIONS_COUNT = CORE_SECTIONS.length; // 28
const REAL_PATTERNS_COUNT = Array.from(
  new Set(CORE_SECTIONS.flatMap((s) => s.subtopics))
).length; // 63 dynamic key patterns
const REAL_TOTAL_PROBLEMS = TOTAL_PROBLEMS; // 357
const REAL_PRACTICE_PROBLEMS_COUNT = ALL_PROBLEMS.length - TOTAL_PROBLEMS; // 567
const REAL_DAY_1 = seedDays()[0];
const REAL_DAY_1_DIFFICULTY_COUNTS = REAL_DAY_1.problems.reduce((acc, p) => {
  acc[p.difficulty] = (acc[p.difficulty] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);
const REAL_DAY_1_EST_MIN = REAL_DAY_1.problems.reduce((a, p) => a + p.estTime, 0);

/* ─── count-up hook (animates immediately on mount & when target updates) ─── */
function useCountUp(target: number, duration = 1000) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || target <= 0) return;
    let start: number | null = null;
    let frameId: number;

    function tick(now: number) {
      if (!start) start = now;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (el) el.textContent = Math.round(eased * target).toString();
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);
  return ref;
}

/* ─── live user count, read from Firestore (users collection count) ─── */
function useLiveUserCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getCountFromServer(collection(db, "users"));
        if (!cancelled) setCount(snap.data().count);
      } catch {
        if (!cancelled) setCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return count;
}

/* ═══════════════════════════════════════════════════════════
   STATS CARDS GRID COMPONENT
═══════════════════════════════════════════════════════════ */
function StatsBar() {
  const liveUserCount = useLiveUserCount();
  const c474 = useCountUp(REAL_TOTAL_PROBLEMS);
  const c586 = useCountUp(REAL_PRACTICE_PROBLEMS_COUNT);
  const cPatterns = useCountUp(REAL_PATTERNS_COUNT);
  const cUsers = useCountUp(liveUserCount ?? 0);
  const c5 = useCountUp(2);
  const c4 = useCountUp(4);

  const stats = [
    ...(liveUserCount !== null
      ? [
        {
          ref: cUsers,
          value: liveUserCount,
          label: "Learners tracking progress",
          sub: "Live count, synced from database",
          prefix: "",
          icon: Users,
          iconColor: "text-rose-600 dark:text-rose-400",
          iconBg: "bg-rose-500/10",
        },
      ]
      : []),
    {
      ref: c474,
      value: REAL_TOTAL_PROBLEMS,
      label: "Core 404 Roadmap",
      sub: "Daily problems covering all key patterns",
      prefix: "",
      icon: Code2,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      ref: c586,
      value: REAL_PRACTICE_PROBLEMS_COUNT,
      label: "Practice 404 Sheet",
      sub: "Alt practice problems for Core 404",
      prefix: "",
      icon: BarChart3,
      iconColor: "text-cyan-600 dark:text-cyan-400",
      iconBg: "bg-cyan-500/10",
    },
    {
      ref: cPatterns,
      value: REAL_PATTERNS_COUNT,
      label: `Patterns & ${REAL_SECTIONS_COUNT} Sections`,
      sub: `${REAL_PATTERNS_COUNT} Key Patterns (Arrays to Graphs & DP)`,
      prefix: "",
      icon: LayoutGrid,
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-500/10",
    },
    {
      ref: c5,
      value: 2,
      label: "Curated sheets + contests",
      sub: "Core 404 · Practice 404 Sheet · CP rounds",
      prefix: "",
      icon: Trophy,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
    },
    {
      ref: c4,
      value: 3,
      label: "Built-in Integrations",
      sub: "YouTube · ChatGPT(Solve) · Google",
      prefix: "",
      icon: Sparkles,
      iconColor: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
      {stats.map((s, idx) => {
        const Icon = s.icon;
        const tagLabels = ["LIVE_SYNC", "O(N)_PATH", "// ALT_SET", `${REAL_PATTERNS_COUNT}_PATTERNS`, "TOP_TIER", "AI_PLUGINS"];
        const tagColors = [
          "text-rose-500 bg-rose-500/10 border-rose-500/30",
          "text-blue-500 bg-blue-500/10 border-blue-500/30",
          "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
          "text-purple-500 bg-purple-500/10 border-purple-500/30",
          "text-amber-500 bg-amber-500/10 border-amber-500/30",
          "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
        ];

        return (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-xl bg-card border border-border p-3.5 shadow-sm transition-colors duration-200 hover:border-primary/60 hover:shadow-md cursor-pointer"
          >
            {/* Subtle Code Gradient Glow Backdrop on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <div className={`inline-flex size-8 items-center justify-center rounded-lg ${s.iconBg} transition-transform duration-300`}>
                <Icon className={`size-4 ${s.iconColor}`} />
              </div>

              {/* Animated Coding Tag Badge */}
              <div className="flex items-center gap-1">
                {idx === 0 && <span className="size-2 rounded-full bg-rose-500 animate-ping" />}
                <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${tagColors[idx % tagColors.length]}`}>
                  {tagLabels[idx % tagLabels.length]}
                </span>
              </div>
            </div>

            <p className="font-mono text-2xl font-black text-foreground tabular-nums leading-none tracking-tight group-hover:text-primary transition-colors">
              {s.prefix}
              <span ref={s.ref}>{s.value}</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-foreground truncate">{s.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-tight">{s.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

function MottoCardsSection() {
  const cards = [
    {
      num: "01",
      question: "Problem not found?",
      action: "Find it.",
      badge: "Core 404 Roadmap",
      desc: `Instant access to ${REAL_TOTAL_PROBLEMS} roadmap problems & ${REAL_PRACTICE_PROBLEMS_COUNT} practice sheets`,
      leftBorder: "border-l-4 border-l-sky-500 border-sky-500/30",
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
      actionColor: "text-sky-600 dark:text-sky-400 font-black",
      badgeColor: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
      icon: Search,
    },
    {
      num: "02",
      question: "Problem found?",
      action: "Solve it.",
      badge: "ChatGPT AI Tutor",
      desc: "Step-by-step logic hints without code spoilers",
      leftBorder: "border-l-4 border-l-amber-500 border-amber-500/30",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      actionColor: "text-amber-600 dark:text-amber-400 font-black",
      badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
      icon: Zap,
    },
    {
      num: "03",
      question: "Problem solved?",
      action: "Master it.",
      badge: `${REAL_PATTERNS_COUNT} Key Patterns`,
      desc: `Internalize reusable techniques across ${REAL_SECTIONS_COUNT} DSA sections`,
      leftBorder: "border-l-4 border-l-emerald-500 border-emerald-500/30",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      actionColor: "text-emerald-600 dark:text-emerald-400 font-black",
      badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      icon: Trophy,
    },
  ];

  return (
    <div className="w-full max-w-md sm:max-w-lg space-y-3">
      {/* Animated Header Badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-xs font-black tracking-widest text-primary uppercase">
            DSA 404 · Core Principles
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground font-bold">3-Step Mastery Cycle</span>
      </div>

      {/* 3 High-Contrast Crisp Cards */}
      <div className="grid grid-cols-1 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.num}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl cursor-default",
                card.leftBorder
              )}
            >
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs transition-transform duration-200 group-hover:scale-105",
                      card.iconBg
                    )}
                  >
                    <Icon className="size-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{card.num}.</span>
                      <span className="text-sm font-semibold text-foreground">{card.question}</span>
                      <span className={cn("text-sm font-mono tracking-tight", card.actionColor)}>
                        {card.action}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 dark:text-zinc-300 font-medium truncate mt-0.5">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] font-bold shrink-0 hidden sm:inline-flex border shadow-xs",
                    card.badgeColor
                  )}
                >
                  {card.badge}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TerminalLoadingCard() {
  return (
    <div className="hero-terminal z-20 w-full max-w-md sm:max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
        <span className="size-3 rounded-full bg-red-500/70" />
        <span className="size-3 rounded-full bg-yellow-500/70" />
        <span className="size-3 rounded-full bg-green-500/70" />
        <span className="ml-2 font-mono text-xs font-bold text-muted-foreground">dsa-tracker — zsh</span>
      </div>
      <div className="p-5 font-mono text-xs sm:text-sm leading-7">
        <p className="text-primary font-bold">&gt; Loading plan...</p>
        <p>
          <span className="text-muted-foreground">  Day     </span>
          <span className="text-foreground font-semibold">Day {REAL_DAY_1.dayNumber}</span>
        </p>
        <p>
          <span className="text-muted-foreground">  Section </span>
          <span className="text-foreground">{REAL_DAY_1.section}</span>
        </p>
        <p>
          <span className="text-muted-foreground">  Topic   </span>
          <span className="text-foreground">{REAL_DAY_1.topic}</span>
        </p>
        <p>
          <span className="text-muted-foreground">  Problems</span>
          <span className="text-foreground"> {REAL_DAY_1.problems.length} </span>
          <span className="text-green-500 text-xs">
            ({Object.entries(REAL_DAY_1_DIFFICULTY_COUNTS).map(([d, n]) => `${d} ×${n}`).join(", ")})
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">  Est time</span>
          <span className="text-foreground"> {Math.floor(REAL_DAY_1_EST_MIN / 60)}h {REAL_DAY_1_EST_MIN % 60}m</span>
        </p>
        <p>
          <span className="text-muted-foreground">  Status  </span>
          <span className="text-yellow-400">⬜ pending</span>
          <span className="terminal-cursor text-primary font-bold"> _</span>
        </p>
      </div>
    </div>
  );
}

function HeroSection() {
  const { promptInstall } = usePWAInstall();

  return (
    <section className="relative overflow-hidden py-6 sm:py-10">
      {/* subtle grid bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* LAPTOP / DESKTOP RECOMMENDATION & CHROME APP BANNER */}
      <div className="relative mx-auto max-w-6xl mb-6">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10 p-3.5 sm:p-4 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Laptop className="size-5" />
            </div>
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-foreground">💡 Recommended Experience:</span>{" "}
              <span className="text-muted-foreground">
                For the best multi-column coding experience, open this website on a <strong>Desktop/Laptop</strong>. Also, <strong>install the Chrome Application (PWA)</strong> for smoother usage, fast login, and instant daily notifications!
              </span>
            </div>
          </div>
          <Button
            onClick={promptInstall}
            size="sm"
            className="font-mono text-xs font-bold gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
          >
            <ChromeIcon className="size-3.5" />
            Install Chrome App
          </Button>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Branding, Motto Cards (Mobile), Headline, Copy, CTAs */}
          <div className="md:col-span-6 flex flex-col items-start">
            <div className="flex items-center gap-4 sm:gap-5 mb-4">
              <div className="size-14 sm:size-16 rounded-full overflow-hidden shadow-xl border-2 sm:border-4 border-background/50 ring-2 ring-primary/20 bg-background shrink-0">
                <img src="/logo.jpg" alt="DSA404 Logo" className="size-full object-cover" />
              </div>
              <div className="font-display font-black tracking-tighter text-[42px] sm:text-[56px] leading-none flex items-baseline select-none">
                <span className="bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent drop-shadow-md">DSA</span>
                <span className="bg-gradient-to-br from-primary to-orange-500 bg-clip-text text-transparent drop-shadow-md ml-[2px]">⁴⁰⁴</span>
              </div>
            </div>

            {/* Mobile View: Motto Cards display directly below DSA 404 logo */}
            <div className="block md:hidden w-full my-4">
              <MottoCardsSection />
            </div>

            <h1 className="hero-headline font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight max-w-2xl">
              Track DSA your way.<br />
              <span className="text-primary">"Set your pace. Stay consistent. Control the controllables."</span>
            </h1>

            <p className="hero-sub mt-4 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              A daily problem checklist built from the <b>Core 404 DSA Roadmap</b> — tuned to fit <em>your</em> life.
              Pick how many <b>Easy, Medium, and Hard</b> problems you want each day. The plan builds itself around that number,
              and you can raise or lower it any time from <b>Settings</b> — the remaining problems instantly redistribute.
              <br />
              Every day features <b>topic-focused problems</b>, a <b>12-step checklist</b>, and built-in <b>ChatGPT integration</b> that explains
              problem statements and provides step-by-step logic hints to guide you to the solution — without giving away the code.
              <br />
              <b>Life happens.</b> Postpone, skip, or insert revision days, and the entire plan rebalances automatically.
              <br />
              Already know a topic? <b>Skip it from the Topic View.</b> Changed your mind later?
              You can <b>unskip it anytime</b> and bring it back into your roadmap.
              <br /><br />
              <b>The Goal Isn't “404 Problems.”</b>
              <br />
              The goal is to know the <b>patterns.</b>
              <br />
              <em>
                You don't need to solve this many or that many problems just to increase a number.
                You need to understand the patterns in DSA, recognize when a pattern applies,
                and confidently use it to solve new problems.
              </em>
              <br />
              <b>Stay focused until you know all the patterns.</b>
              <br />
            </p>

            <div className="hero-cta mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <Button asChild size="lg" className="font-mono justify-center text-center">
                <Link href="/auth?next=/today">
                  Start your DSA plan
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-mono justify-center text-center">
                <a href="#explore">See how it works</a>
              </Button>
            </div>
          </div>

          {/* Right Column: Desktop View parallel layout (Motto Section Cards & Terminal Loading Card) */}
          <div className="md:col-span-6 flex flex-col items-center justify-center gap-8 sm:gap-12">
            <div className="hidden md:block w-full">
              <MottoCardsSection />
            </div>
            <TerminalLoadingCard />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILT-IN INTEGRATIONS FEATURE WALKTHROUGH
═══════════════════════════════════════════════════════════ */
function BuiltInIntegrationsSection() {
  const [selectedIntegration, setSelectedIntegration] = useState<
    "solve" | "youtube" | "chatgpt" | "google" | null
  >(null);

  const toggleIntegration = (type: "solve" | "youtube" | "chatgpt" | "google") => {
    setSelectedIntegration((prev) => (prev === type ? null : type));
  };

  return (
    <div className="mt-8 sm:mt-12 rounded-2xl sm:rounded-3xl border border-border bg-card/60 backdrop-blur-xl p-4 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary font-mono font-semibold mb-3 shadow-sm">
          <Sparkles className="size-3.5 text-primary shrink-0" />
          <span>Built-in Integrations</span>
        </div>
        <h3 className="font-display text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground break-words">
          Every tool you need, one click away
        </h3>
        <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Each problem on the Today tab and Problems page comes with direct links to Socratic AI Tutor, YouTube, ChatGPT, and Google — no copy-pasting, no switching tabs manually.
        </p>
      </div>

      {/* Sample Problem Row showing problem name + all 4 integration buttons */}
      <div className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl border border-border/80 bg-background/80 p-3.5 sm:p-5 shadow-lg backdrop-blur-md">
        <div className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex flex-wrap items-center justify-between gap-2">
          <span>Live Problem Row Action Bar (Interactive Demo):</span>
          <span className="text-primary font-bold">
            {selectedIntegration ? "Click active button to hide details ↑" : "Click any button below to view details ↓"}
          </span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-border/60 bg-card p-3 sm:p-4 shadow-sm">
          {/* Problem Meta (ID, Name, Badges) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="size-4 rounded border border-primary/50 bg-primary/20 flex items-center justify-center shrink-0">
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <span className="font-mono text-xs font-bold text-muted-foreground">#1</span>
            <span className="font-display font-bold text-sm sm:text-base text-foreground">Two Sum</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Core 404</span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">Easy</span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">LeetCode</span>
          </div>

          {/* All 4 Integration Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              title="YouTube: Watch YouTube video tutorials and editorial explanations"
              onClick={() => toggleIntegration("youtube")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer select-none",
                selectedIntegration === "youtube"
                  ? "border-red-500/60 bg-red-500/20 text-red-500 ring-2 ring-red-500/30 scale-105"
                  : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
              )}
            >
              <YoutubeIcon className="size-3.5 fill-red-500/20 shrink-0" />
              <span>▶ YouTube</span>
            </button>

            <button
              type="button"
              title="ChatGPT: Open pre-filled ChatGPT prompt for brute-force to optimal analysis"
              onClick={() => toggleIntegration("chatgpt")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer select-none",
                selectedIntegration === "chatgpt"
                  ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-500 ring-2 ring-emerald-500/30 scale-105"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              )}
            >
              <Bot className="size-3.5 shrink-0" />
              <span>✦ ChatGPT</span>
            </button>

            <button
              type="button"
              title="Solve: Open Socratic AI tutor on ChatGPT for step-by-step logic hints without code spoilers"
              onClick={() => toggleIntegration("solve")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer select-none",
                selectedIntegration === "solve"
                  ? "border-amber-500/60 bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/30 scale-105"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              )}
            >
              <Zap className="size-3.5 fill-amber-500/20 shrink-0" />
              <span>⚡ Solve</span>
            </button>

            <button
              type="button"
              title="Google Search: Search Google across LeetCode, GFG, TUF & YouTube"
              onClick={() => toggleIntegration("google")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer select-none",
                selectedIntegration === "google"
                  ? "border-sky-500/60 bg-sky-500/20 text-sky-500 ring-2 ring-sky-500/30 scale-105"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
              )}
            >
              <Search className="size-3.5 shrink-0" />
              <span>🔍 Google</span>
            </button>
          </div>
        </div>
      </div>

      {/* EXPANDED FEATURE WALKTHROUGH CARD BELOW */}
      {selectedIntegration && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden transition-all animate-in fade-in duration-300">
          {selectedIntegration === "solve" && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Zap className="size-5 fill-amber-500/20" />
                  </div>
                  <div>
                    <h4 className="font-display text-base sm:text-lg font-bold text-foreground">
                      Solve Button Integration (Interactive ChatGPT Socratic AI Tutor)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Redirects to ChatGPT with a pre-loaded Socratic prompt — problem statement & hints ONLY, zero code spoilers
                    </p>
                  </div>
                </div>
                <a
                  href={getChatGPTAiPromptUrl("Two Sum")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 text-xs font-mono font-semibold transition-colors shadow-md w-full sm:w-auto shrink-0"
                >
                  <span>Try Solve (AI Tutor) Demo</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              </div>

              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                Clicking the <strong>⚡ Solve</strong> button present on every problem row opens ChatGPT with a pre-filled Socratic tutor prompt. It presents the problem statement and guides you with hints step-by-step — giving zero code spoilers until requested, saving time when you get stuck!
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                <div className="lg:col-span-6 space-y-3">
                  <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-amber-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Shows Problem Statement & Examples First:</strong> Clearly states the problem goal, constraints, input/output formats, and sample test cases.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-amber-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Gives Hints ONLY (NO Code Spoilers):</strong> Strictly refrains from dumping code or final answers, keeping your focus on building real problem-solving logic.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-amber-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Reduces Time Waste When Stuck:</strong> Delivers progressive hints (Hint 1 → Hint 2 → Edge Cases) whenever you hit a wall, so you never get permanently blocked.</span>
                    </li>
                  </ul>

                  <div>
                    <span className="text-xs font-mono text-muted-foreground font-semibold">Live Button Graphic Preview:</span>
                    <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400 flex items-center justify-between gap-2 shadow-sm font-mono text-xs">
                      <span className="font-bold truncate">⚡ Solve with Interactive ChatGPT DSA AI Tutor</span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 sm:p-4 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-amber-500 font-bold uppercase tracking-wider text-[10px]">
                    <span>Socratic Tutor Prompt System:</span>
                    <span>Hints Only</span>
                  </div>
                  <pre className="p-3 rounded-lg bg-background/90 border border-border text-foreground text-[11px] leading-relaxed whitespace-pre-wrap font-mono max-h-48 overflow-y-auto break-words break-all">
                    {`# DSA AI Editor & Tutor
Problem Name: Two Sum

## STRICT RULE: DO NOT GIVE THE SOLUTION
Your primary goal is to make the user think and discover the solution themselves.
Do NOT provide complete solution code or the optimal algorithm immediately.

# STEP 1 — Introduce the Problem
1. Explain the problem statement & requirements in simple language.
2. Provide input/output formats, constraints, and test case examples.
3. End with: "Now try to think of your own approach. I won't give you the solution directly; I'll guide you with hints."`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {selectedIntegration === "youtube" && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                    <YoutubeIcon className="size-5 fill-red-500/20" />
                  </div>
                  <div>
                    <h4 className="font-display text-base sm:text-lg font-bold text-foreground">
                      YouTube Video Solutions & Walkthroughs
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Direct video search tuned for DSA creators, brute force, and optimal approach explanations
                    </p>
                  </div>
                </div>
                <a
                  href="https://www.youtube.com/results?search_query=Two+Sum+solution+intuition+explained+NeetCode+OR+Striver"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 text-xs font-mono font-semibold transition-colors shadow-md w-full sm:w-auto shrink-0"
                >
                  <span>Try YouTube Demo</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                <div className="lg:col-span-6 space-y-3">
                  <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Searches by problem name + DSA keywords:</strong> Automatically constructs exact queries to bypass fluff and find real implementations.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Finds TUF (Striver), NeetCode, and more:</strong> Prioritizes top-tier competitive programming and DSA educators.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Available on Today tab and Problems page:</strong> Access video explanations instantly anywhere in the workspace.</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-6 flex items-center justify-center">
                  <div className="w-full rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center font-mono text-xs space-y-2">
                    <span className="text-muted-foreground font-semibold">Live Button Action Preview:</span>
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-500 flex items-center justify-center gap-2 font-bold shadow-sm">
                      <YoutubeIcon className="size-4 shrink-0 fill-red-500/20" />
                      <span className="truncate">▶ Two Sum — brute force optimal explained</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedIntegration === "chatgpt" && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Bot className="size-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-display text-base sm:text-lg font-bold text-foreground">
                      ChatGPT Pre-filled AI Explanation Prompt
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      One click opens ChatGPT with a pre-filled prompt asking for full breakdown, TC & SC
                    </p>
                  </div>
                </div>
                <a
                  href="https://chatgpt.com/?q=Explain%20the%20problem%20%22Two%20Sum%22%20in%20detail.%20Cover%3A%201.%20Problem%20intuition%202.%20Brute%20force%203.%20Better%204.%20Optimal%20solution"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-mono font-semibold transition-colors shadow-md w-full sm:w-auto shrink-0"
                >
                  <span>Try ChatGPT Explain Demo</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                <div className="lg:col-span-6 space-y-3">
                  <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Prompt covers brute, better & optimal:</strong> Get a structured breakdown from naive loops to hash maps or two pointers.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Includes TC, SC and intuition:</strong> Rigorous Big-O analysis and spatial complexity for every approach.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Works on every problem in the app:</strong> 1-click prompt generator available across all Core 404 & Practice 404 problems.</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-6 flex items-center justify-center">
                  <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center font-mono text-xs space-y-2">
                    <span className="text-muted-foreground font-semibold">Live Button Action Preview:</span>
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-500 flex items-center justify-center gap-2 font-bold shadow-sm">
                      <Bot className="size-4 shrink-0" />
                      <span className="truncate">✦ Explain "Two Sum": brute force → optimal, TC & SC...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedIntegration === "google" && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <Search className="size-5 text-sky-500" />
                  </div>
                  <div>
                    <h4 className="font-display text-base sm:text-lg font-bold text-foreground">
                      Google Search — Targeted Multi-Platform Search
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Pre-queried Google search across LeetCode, GeeksforGeeks, TakeUForward & YouTube
                    </p>
                  </div>
                </div>
                <a
                  href="https://www.google.com/search?q=Two+Sum+DSA+solution+explanation+site%3Aleetcode.com+OR+site%3Ageeksforgeeks.org+OR+site%3Atakeuforward.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 text-xs font-mono font-semibold transition-colors shadow-md w-full sm:w-auto shrink-0"
                >
                  <span>Try Google Search Demo</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                <div className="lg:col-span-6 space-y-3">
                  <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-sky-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Finds editorials, articles, and videos:</strong> Aggregates top editorial writeups across all major DSA platforms.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-sky-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Pre-built query — no typing needed:</strong> Saves repetitive typing by scoping queries automatically.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-sky-500 font-bold font-mono text-sm leading-none shrink-0">›</span>
                      <span className="break-words"><strong>Available on every problem row:</strong> Directly integrated into problem cards and rows.</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-6 flex items-center justify-center">
                  <div className="w-full rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 text-center font-mono text-xs space-y-2">
                    <span className="text-muted-foreground font-semibold">Live Button Action Preview:</span>
                    <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-sky-500 flex items-center justify-center gap-2 font-bold shadow-sm">
                      <Search className="size-4 shrink-0" />
                      <span className="truncate">🔍 Two Sum DSA LeetCode TUF GeeksforGeeks...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Home ("/") — Logged-in users are bounced straight to /today.
 * Signed-out / new visitors see the hero section, motto badge, zsh terminal card,
 * dynamic stats cards, built-in integrations feature section, and an interactive demo shell.
 */
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = checking
  const { promptInstall, isModalOpen, setIsModalOpen, isIOS, isStandalone } = usePWAInstall();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        router.replace("/today");
      } else {
        setUser(null);
      }
    });
    return unsub;
  }, [router]);

  // Still checking auth state, or a logged-in user is mid-redirect —
  // avoid flashing the UI in either case.
  if (user === undefined) {
    return <QuoteLoader fullScreen />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-full overflow-hidden border border-border/80 shadow-sm ring-1 ring-primary/20 bg-background shrink-0">
              <img src="/logo.jpg" alt="DSA404 Logo" className="size-full object-cover" />
            </div>
            <div className="font-display font-black tracking-tighter text-[22px] leading-none flex items-baseline select-none">
              <span className="bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">DSA</span>
              <span className="bg-gradient-to-br from-primary to-orange-500 bg-clip-text text-transparent ml-[1px]">⁴⁰⁴</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {!isStandalone && (
              <Button
                onClick={promptInstall}
                variant="outline"
                size="sm"
                className="font-mono text-xs gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary cursor-pointer"
              >
                <ChromeIcon className="size-3.5" />
                Install App
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="font-mono text-xs hidden sm:inline-flex">
              <Link href="/auth">Login</Link>
            </Button>
            <Button asChild size="sm" className="font-mono text-xs">
              <Link href="/auth">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <HeroSection />
        <StatsBar />
        <BuiltInIntegrationsSection />
        <InstallApkSection />

        <div id="explore" className="mt-14 pt-8 border-t border-border/50">
          <div className="mb-6 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs text-primary font-mono mb-3">
              <Sparkles className="size-3" />
              Interactive Demo
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Explore the full workspace with live sample data
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Test drive all 924 problems, 17 weeks of roadmap, daily checklists, and progress tracking below.
            </p>
          </div>

          <DemoShell />
        </div>

        <div className="mt-14 text-center max-w-md mx-auto px-2">
          <p className="text-sm text-muted-foreground mb-4">Ready to track your own progress?</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full">
            <Button asChild size="lg" className="font-mono text-xs sm:text-sm h-auto py-3 px-5 text-center whitespace-normal break-words justify-center">
              <Link href="/auth">Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-mono text-xs sm:text-sm h-auto py-3 px-5 text-center whitespace-normal break-words justify-center">
              <Link href="/auth">I already have an account</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 mt-12">
        <p className="text-center text-xs text-muted-foreground font-mono">
          DSA⁴⁰⁴ · Built for structured, consistent DSA practice
        </p>
      </footer>

      <ChromeInstallModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        isIOS={isIOS}
        isStandalone={isStandalone}
      />
    </div>
  );
}