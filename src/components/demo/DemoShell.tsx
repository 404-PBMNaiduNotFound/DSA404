"use client";

/**
 * DemoShell — a fully static, fake-data preview of the interior app.
 *
 * IMPORTANT: This component is intentionally self-contained. It does NOT
 * import any real hooks (usePlan, useSettings, useAuth, Firestore, etc.)
 * and does NOT touch any of the real authenticated pages under
 * app/(authenticated)/*. It only *looks* like the real interior so a
 * signed-out visitor can understand what the product does before they
 * register. Nothing here reads or writes the database.
 */

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Code2,
  LayoutGrid,
  CalendarRange,
  Flame,
  BookmarkCheck,
  CalendarDays,
  Trophy,
  UserCircle2,
  Settings,
  CheckCircle2,
  Circle,
  Bookmark,
  Lock,
  Zap,
  Bot,
  Search,
  RotateCcw,
  PlusCircle,
  Combine,
  Ban,
  Undo2,
  Code,
  Video,
  Menu,
  X,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SubmissionHeatmap } from "@/components/SubmissionHeatmap";

const DEMO_NAV = [
  { key: "today", label: "Today's Workspace", icon: Sparkles },
  { key: "problems", label: "Problems", icon: Code2 },
  { key: "topics", label: "Topic View", icon: LayoutGrid },
  { key: "weeks", label: "Week View", icon: CalendarRange },
  { key: "progress", label: "Progress", icon: Flame },
  { key: "review", label: "Review", icon: BookmarkCheck },
  { key: "backlog", label: "Backlog", icon: CalendarDays },
  { key: "contests", label: "Contests", icon: Trophy },
  { key: "profile", label: "Developer Profile", icon: UserCircle2 },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

type DemoTab = (typeof DEMO_NAV)[number]["key"];

/* ── fake data (display-only, never persisted) ───────────────────────── */
const FAKE_USER = {
  name: "Aditi Sharma",
  initials: "AS",
  streak: 14,
  day: 23,
  totalDays: 119,
  solved: 187,
  total: 904,
};

const FAKE_TODAY_PROBLEMS = [
  { title: "Reverse Linked List", difficulty: "Easy", done: true, platform: "LeetCode" },
  { title: "Detect Cycle in Linked List", difficulty: "Easy", done: true, platform: "LeetCode" },
  { title: "Merge Two Sorted Lists", difficulty: "Easy", done: false, platform: "GFG" },
  { title: "Add Two Numbers (Linked List)", difficulty: "Medium", done: false, platform: "LeetCode" },
  { title: "Flatten a Multilevel DLL", difficulty: "Hard", done: false, platform: "LeetCode" },
];

const FAKE_TOPICS = [
  { name: "Arrays", solved: 22, total: 34, isSkipped: false, sub: "Arrays · Cyclic Sort · Two Pointers" },
  { name: "Binary Search", solved: 4, total: 6, isSkipped: false, sub: "Sorting · Search Space Reduction" },
  { name: "Linked List", solved: 13, total: 16, isSkipped: false, sub: "Pointers · Fast/Slow · Node Reversal" },
  { name: "Stacks & Queues", solved: 9, total: 16, isSkipped: true, sub: "LIFO · Monotonic Stack · Deque" },
  { name: "Binary Trees", solved: 11, total: 25, isSkipped: false, sub: "DFS · BFS · Traversal · LCA" },
  { name: "Dynamic Programming", solved: 5, total: 44, isSkipped: false, sub: "1D/2D DP · Knapsack · LCS · LIS" },
];

const FAKE_WEEKS = Array.from({ length: 8 }, (_, i) => ({
  week: i + 1,
  status: i < 3 ? "done" : i === 3 ? "active" : "upcoming",
}));

function DifficultyBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Easy: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    Medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    Hard: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  };
  return <Badge variant="outline" className={cn("font-mono text-[10px]", styles[level])}>{level}</Badge>;
}

function DemoCTA({ label = "Sign up free to save this" }: { label?: string }) {
  return (
    <Link
      href="/auth"
      className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
    >
      <Lock className="size-3" /> {label}
    </Link>
  );
}

/* ── panels ────────────────────────────────────────────────────────── */

function TodayPanel() {
  const { heatmapData, detailMap } = React.useMemo(() => {
    const data: { date: string; solved: number }[] = [];
    const detailMap: Record<string, any[]> = {};
    const today = new Date();

    for (let i = 180; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      
      const rand = Math.sin(i * 3.7 + 1.2) * 10000;
      const pseudoRandom = Math.abs(rand - Math.floor(rand));
      
      let solved = 0;
      if (pseudoRandom > 0.45) {
        solved = Math.floor(pseudoRandom * 4) + 1;
      }

      if (solved > 0) {
        data.push({ date: dateStr, solved });
        detailMap[dateStr] = Array.from({ length: solved }, (_, idx) => ({
          name: idx === 0 ? "Reverse Linked List" : idx === 1 ? "Middle of Linked List" : idx === 2 ? "Merge Two Sorted Lists" : "Linked List Cycle",
          done: true,
          platform: idx % 2 === 0 ? "LeetCode" : "GeeksforGeeks",
        }));
      }
    }
    return { heatmapData: data, detailMap };
  }, []);

  return (
    <div className="space-y-6">
      {/* Today Workspace Card */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        {/* Header & Day Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Day {FAKE_USER.day} of {FAKE_USER.totalDays}</span>
              <span className="text-xs text-muted-foreground">· Linked List</span>
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mt-0.5">Today's Workspace: Linked List Basics</h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-mono font-semibold text-orange-600 dark:text-orange-400">
              <Flame className="size-3.5" /> {FAKE_USER.streak}-day streak
            </div>
          </div>
        </div>

        {/* Workspace Day Actions Bar (Revision, Borrow, Merge, Delete/Skip) */}
        <div className="mb-4 rounded-xl border border-border/80 bg-muted/40 p-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-muted-foreground">Workspace Day Controls:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              title="Revision: Mark this entire day or topic for weekly revision on Sunday"
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-mono font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <RotateCcw className="size-3" /> Revision
            </button>
            <button
              type="button"
              title="Borrow: Borrow a problem from a future day into today's workload"
              className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <PlusCircle className="size-3" /> Borrow
            </button>
            <button
              type="button"
              title="Merge: Merge today's workload with tomorrow's study day"
              className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-mono font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              <Combine className="size-3" /> Merge
            </button>
            <button
              type="button"
              title="Delete / Skip: Skip or delete this day's topic — remaining syllabus rebalances automatically"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-mono font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
            >
              <Ban className="size-3" /> Delete / Skip
            </button>
          </div>
        </div>

        {/* Problems List with All Action Buttons */}
        <div className="space-y-3">
          {FAKE_TODAY_PROBLEMS.map((p, idx) => (
            <div key={p.title} className="rounded-xl border border-border/80 bg-background p-3.5 transition-all hover:border-border">
              {/* Problem Title & Meta Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {p.done ? (
                    <span title="Completed"><CheckCircle2 className="size-4 text-emerald-500 shrink-0" /></span>
                  ) : (
                    <span title="Pending"><Circle className="size-4 text-muted-foreground shrink-0" /></span>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                  <span className={cn("text-sm font-semibold truncate", p.done && "line-through text-muted-foreground")}>
                    {p.title}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {p.platform}
                  </span>
                </div>
                <DifficultyBadge level={p.difficulty} />
              </div>

              {/* Problem Action Bar (Solve, YouTube, ChatGPT, Search, Solution Code, Review) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
                <button
                  type="button"
                  title="Solve: Launch interactive ChatGPT Socratic AI Tutor with step-by-step logic hints and zero code spoilers"
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                >
                  <Zap className="size-3 fill-amber-500/20" /> ⚡ Solve
                </button>

                <button
                  type="button"
                  title="YouTube: Search YouTube video tutorials and editorial explanations"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Video className="size-3" /> ▶ YouTube
                </button>

                <button
                  type="button"
                  title="ChatGPT: Open pre-filled ChatGPT prompt for brute-force to optimal logic analysis"
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Bot className="size-3" /> ✦ ChatGPT
                </button>

                <button
                  type="button"
                  title="Google Search: Search Google across LeetCode, GFG, TUF & YouTube"
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
                >
                  <Search className="size-3" /> 🔍 Search
                </button>

                <button
                  type="button"
                  title="Code / Solution: View canonical C++/Java/Python solution code"
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2 py-1 text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                >
                  <Code className="size-3" /> 💻 Code
                </button>

                <button
                  type="button"
                  title="Review: Flag problem to revisit later in your Review tab"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2 py-1 text-[11px] font-mono font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  <Bookmark className="size-3" /> Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h4 className="font-display font-semibold mb-3 text-sm">Solved Days Activity Heatmap</h4>
        <SubmissionHeatmap data={heatmapData} detailMap={detailMap} />
      </div>
    </div>
  );
}

function ProblemsPanel() {
  const platforms = ["All", "LeetCode", "GFG", "CodeChef", "HackerRank"];
  const [active, setActive] = useState("All");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setActive(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-mono border transition-colors",
              active === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {FAKE_TODAY_PROBLEMS.concat([
          { title: "Course Schedule (Topo Sort)", difficulty: "Medium", done: false, platform: "LeetCode" },
          { title: "Number of Islands", difficulty: "Medium", done: true, platform: "LeetCode" },
        ]).map((p, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              {p.done ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0" /> : <Circle className="size-4 text-muted-foreground shrink-0" />}
              <span className="text-sm truncate">{p.title}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{p.platform}</span>
              <DifficultyBadge level={p.difficulty} />
              <button
                type="button"
                title="Review: Flag problem to revisit later in your Review tab"
                className="text-muted-foreground hover:text-foreground"
              >
                <Bookmark className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Showing a small sample — the real Problems tab has 904 problems across two curated sheets. <DemoCTA label="Register to unlock the full set" /></p>
    </div>
  );
}

function TopicsPanel() {
  const [topics, setTopics] = useState(FAKE_TOPICS);

  const toggleSkip = (name: string) => {
    setTopics((prev) =>
      prev.map((t) => (t.name === name ? { ...t, isSkipped: !t.isSkipped } : t))
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-mono">
        💡 <strong>Topic View Feature:</strong> Click <strong>Skip</strong> on any topic to remove it from your daily roadmap. The remaining syllabus rebalances automatically!
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {topics.map((t) => (
          <div
            key={t.name}
            className={cn(
              "rounded-2xl border bg-card p-4 transition-all",
              t.isSkipped ? "border-dashed border-border/80 bg-muted/30 opacity-70" : "border-border"
            )}
          >
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="min-w-0">
                <span className={cn("font-display font-semibold text-sm block truncate", t.isSkipped && "line-through text-muted-foreground")}>
                  {t.name}
                </span>
                <span className="text-[11px] text-muted-foreground block truncate">{t.sub}</span>
              </div>

              {/* Skip / Un-skip Action Button with hover tooltip */}
              <button
                type="button"
                title={t.isSkipped ? "Un-skip: Restore this topic back into your active daily roadmap" : "Skip: Skip this topic so your roadmap automatically rebalances without it"}
                onClick={() => toggleSkip(t.name)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-mono font-bold transition-colors cursor-pointer",
                  t.isSkipped
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                )}
              >
                {t.isSkipped ? (
                  <><Undo2 className="size-3" /> Un-skip</>
                ) : (
                  <><Ban className="size-3" /> Skip</>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-1.5">
              <span>Progress</span>
              <span className="tabular-nums">{t.solved}/{t.total} problems</span>
            </div>
            <Progress value={(t.solved / t.total) * 100} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeksPanel() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        {FAKE_WEEKS.map((w) => (
          <div
            key={w.week}
            title={`Week ${w.week} (${w.status})`}
            className={cn(
              "aspect-square rounded-xl border flex flex-col items-center justify-center text-xs font-mono",
              w.status === "done" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
              w.status === "active" && "bg-primary/10 border-primary/40 text-primary",
              w.status === "upcoming" && "bg-muted/40 border-border text-muted-foreground"
            )}
          >
            <span className="font-bold">W{w.week}</span>
            <span className="text-[10px]">{w.status}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">The real Week View spans your full 17-week roadmap with per-day drill-down.</p>
    </div>
  );
}

function ProgressPanel() {
  const pct = Math.round((FAKE_USER.solved / FAKE_USER.total) * 100);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display font-semibold text-sm">Overall progress</span>
          <span className="text-xs font-mono text-muted-foreground">{FAKE_USER.solved}/{FAKE_USER.total}</span>
        </div>
        <Progress value={pct} className="h-2.5" />
        <p className="mt-2 text-xs text-muted-foreground">{pct}% complete · sample data</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Current streak", value: `${FAKE_USER.streak} days` },
          { label: "Longest streak", value: "31 days" },
          { label: "Badges earned", value: "6" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-display font-black">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewPanel() {
  const [reviewList, setReviewList] = useState([
    { title: "LRU Cache (Least Recently Used)", difficulty: "Hard", topic: "Linked List & Hash Map", due: "Due Today", platform: "LeetCode" },
    { title: "Trapping Rain Water", difficulty: "Hard", topic: "Two Pointers / Stack", due: "2 Days Ago", platform: "LeetCode" },
    { title: "Word Break (DP)", difficulty: "Medium", topic: "Dynamic Programming", due: "3 Days Ago", platform: "GFG" },
    { title: "Kth Largest Element in an Array", difficulty: "Medium", topic: "Heap / QuickSelect", due: "Last Week", platform: "LeetCode" },
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-base text-foreground">Review & Revision Deck</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Problems you flagged to revisit and strengthen before interviews</p>
          </div>
          <Badge variant="outline" className="font-mono text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
            {reviewList.length} Items Pending Review
          </Badge>
        </div>

        <div className="space-y-3 mt-4">
          {reviewList.map((item, idx) => (
            <div key={item.title} className="rounded-xl border border-border/80 bg-background p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                  <span className="font-semibold text-sm text-foreground">{item.title}</span>
                  <DifficultyBadge level={item.difficulty} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.topic}</span>
                  <span>·</span>
                  <span className="font-mono text-amber-500 font-medium">{item.due}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  title="Solve with Socratic AI Tutor"
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                >
                  <Zap className="size-3" /> ⚡ Solve
                </button>
                <button
                  type="button"
                  title="View solution code"
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                >
                  <Code className="size-3" /> Code
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BacklogPanel() {
  const [backlog, setBacklog] = useState([
    { day: "Day 18", title: "Binary Search Space Reduction & Rotated Sorted Array", problems: 3, est: "45m" },
    { day: "Day 21", title: "Reversing Nodes in K-Group & Circular Doubly Linked List", problems: 2, est: "35m" },
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-base text-foreground">Postponed & Backlog Workload</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Missed or postponed days — rebalance or catch up anytime</p>
          </div>
          <Badge variant="outline" className="font-mono text-xs bg-rose-500/10 text-rose-600 border-rose-500/30">
            {backlog.length} Postponed Days
          </Badge>
        </div>

        <div className="space-y-3 mt-4">
          {backlog.map((item) => (
            <div key={item.day} className="rounded-xl border border-border/80 bg-background p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-primary">{item.day}</span>
                  <span className="font-semibold text-sm text-foreground">{item.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.problems} Problems · Estimated time {item.est}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  title="Re-integrate into active daily roadmap"
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-mono font-bold text-primary hover:bg-primary/20"
                >
                  <Undo2 className="size-3" /> Catch Up
                </button>
                <button
                  type="button"
                  title="Merge into tomorrow's workload"
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                >
                  <Combine className="size-3" /> Merge
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContestsPanel() {
  const contests = [
    { name: "LeetCode Weekly Contest 412", platform: "LeetCode", time: "Sunday 08:00 AM IST", status: "Upcoming", badge: "Rating +32" },
    { name: "CodeChef Starters 150 (Div 2)", platform: "CodeChef", time: "Wednesday 08:00 PM IST", status: "Upcoming", badge: "CP Practice" },
    { name: "AtCoder Beginner Contest 370", platform: "AtCoder", time: "Saturday 05:30 PM IST", status: "Upcoming", badge: "Math & DP" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-display font-bold text-base text-foreground mb-1">Competitive Programming Contests Hub</h3>
        <p className="text-xs text-muted-foreground mb-4">Curated weekly contests to test speed, accuracy, and live rank</p>

        <div className="grid sm:grid-cols-3 gap-3">
          {contests.map((c) => (
            <div key={c.name} className="rounded-xl border border-border/80 bg-background p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">
                    {c.platform}
                  </Badge>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">{c.status}</span>
                </div>
                <h4 className="font-semibold text-sm text-foreground leading-snug">{c.name}</h4>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{c.time}</p>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">{c.badge}</span>
                <span className="text-primary font-bold">Register →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfilePanel() {
  return (
    <div className="space-y-5">
      {/* Profile Header Banner */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 text-white flex items-center justify-center font-display font-black text-2xl shadow-lg shrink-0">
              {FAKE_USER.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl font-bold text-foreground">{FAKE_USER.name}</h3>
                <Badge variant="outline" className="font-mono text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Pro Plan
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">@aditisharma_codes · SDE-1 Aspirant</p>
              <p className="text-xs text-foreground/80 mt-1">Final Year CS Undergrad @ IIT · Target: Top Tech SDE Roles</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-center">
              <p className="font-mono text-lg font-black text-orange-600 dark:text-orange-400">{FAKE_USER.streak} 🔥</p>
              <p className="text-[10px] font-mono text-muted-foreground">Active Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Problems Solved", val: `${FAKE_USER.solved} / ${FAKE_USER.total}` },
          { label: "Completion Rate", val: `${Math.round((FAKE_USER.solved / FAKE_USER.total) * 100)}%` },
          { label: "Mastered Topics", val: "6 / 28" },
          { label: "Preferred Lang", val: "C++ (85%)" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-3.5 text-center">
            <p className="font-mono text-lg font-black text-foreground">{m.val}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Achievements Badges */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h4 className="font-display font-semibold text-sm text-foreground mb-3">Earned Badges & Milestones</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { title: "14-Day Consistency Master", desc: "Maintained 14 consecutive study days", icon: "🥇" },
            { title: "100+ Solved Milestone", desc: "Crossed 100 curated DSA problems", icon: "⚡" },
            { title: "Arrays Specialist", desc: "Mastered 90%+ array patterns", icon: "🎯" },
            { title: "Socratic AI Pioneer", desc: "Used ChatGPT AI tutor 50+ times", icon: "✦" },
            { title: "Contest Contender", desc: "Top 15% in platform contests", icon: "🏆" },
            { title: "Week 3 Milestone", desc: "Finished Foundations & Linked List", icon: "📅" },
          ].map((b) => (
            <div key={b.title} className="rounded-xl border border-border/70 bg-background p-3 flex items-start gap-3">
              <span className="text-2xl shrink-0">{b.icon}</span>
              <div>
                <p className="font-semibold text-xs text-foreground leading-tight">{b.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [workload, setWorkload] = useState(3);
  const [lang, setLang] = useState("C++");

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-display font-bold text-base text-foreground">Roadmap & Workload Customizer</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tune your daily problem target and primary programming language</p>
        </div>

        {/* Daily Target Slider */}
        <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Daily Problem Target</span>
            <span className="font-mono text-xs font-bold text-primary">{workload} Problems / Day</span>
          </div>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setWorkload(num)}
                className={cn(
                  "flex-1 py-2 rounded-lg font-mono text-xs font-bold border transition-colors",
                  workload === num
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {num} {num === 1 ? "Problem" : "Problems"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Current pace: <strong>{workload} problems daily</strong> (1 Easy, 1 Medium, 1 Hard). Estimated roadmap completion: <strong>119 days</strong>.
          </p>
        </div>

        {/* Preferred Language Selector */}
        <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
          <span className="text-xs font-semibold text-foreground block">Primary Coding Language</span>
          <div className="flex flex-wrap gap-2">
            {["C++", "Java", "Python", "JavaScript", "Go"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors",
                  lang === l
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DemoShell() {
  const [activeTab, setActiveTab] = useState<DemoTab>("today");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
      {/* Top mock app bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex size-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar to icons"}
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-red-500/70" />
            <span className="size-3 rounded-full bg-yellow-500/70" />
            <span className="size-3 rounded-full bg-green-500/70" />
          </div>
          <span className="font-mono text-xs font-semibold text-muted-foreground border-l border-border pl-3">
            DSA⁴⁰⁴ Workspace Preview
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">
            DEMO MODE
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden size-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[540px]">
        {/* Mock Sidebar (Desktop: Collapsible between w-56 expanded and w-16 icon-only) */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-border bg-muted/20 p-3 shrink-0 transition-all duration-300",
            isCollapsed ? "w-16 items-center px-2" : "w-56"
          )}
        >
          <div className="space-y-1 w-full">
            {DEMO_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center rounded-xl transition-all text-left",
                    isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2 text-xs font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-4 border-t border-border/60 text-center w-full">
            {!isCollapsed ? (
              <>
                <p className="text-[11px] text-muted-foreground mb-2">Want to save your real progress?</p>
                <Button asChild size="sm" className="w-full font-mono text-xs">
                  <Link href="/auth">Register Now</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="icon" className="size-9 rounded-xl mx-auto" title="Register Now to save progress">
                <Link href="/auth">
                  <Lock className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </aside>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-muted/40 p-2 space-y-1">
            {DEMO_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-left",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-background/50">
          {activeTab === "today" && <TodayPanel />}
          {activeTab === "problems" && <ProblemsPanel />}
          {activeTab === "topics" && <TopicsPanel />}
          {activeTab === "weeks" && <WeeksPanel />}
          {activeTab === "progress" && <ProgressPanel />}
          {activeTab === "review" && <ReviewPanel />}
          {activeTab === "backlog" && <BacklogPanel />}
          {activeTab === "contests" && <ContestsPanel />}
          {activeTab === "profile" && <ProfilePanel />}
          {activeTab === "settings" && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}
