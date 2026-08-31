"use client";

import React from "react";

interface DifficultyBreakdownProps {
  easy: number | null;
  medium: number | null;
  hard: number | null;
  total?: number | null;
}

export function DifficultyBreakdown({ easy, medium, hard, total }: DifficultyBreakdownProps) {
  if (easy === null && medium === null && hard === null) {
    return (
      <div className="text-xs text-muted-foreground/70 italic py-1">
        Difficulty statistics not provided by platform
      </div>
    );
  }

  const e = easy ?? 0;
  const m = medium ?? 0;
  const h = hard ?? 0;
  const sum = total || (e + m + h) || 1;

  const ePct = Math.round((e / sum) * 100);
  const mPct = Math.round((m / sum) * 100);
  const hPct = Math.min(100 - ePct - mPct, Math.round((h / sum) * 100));

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div style={{ width: `${ePct}%` }} className="bg-emerald-500 transition-all" title={`Easy: ${e}`} />
        <div style={{ width: `${mPct}%` }} className="bg-amber-500 transition-all" title={`Medium: ${m}`} />
        <div style={{ width: `${hPct}%` }} className="bg-rose-500 transition-all" title={`Hard: ${h}`} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
          <span className="text-[10px] font-bold text-emerald-400 block uppercase">Easy</span>
          <span className="font-extrabold text-sm text-foreground tabular-nums">{easy !== null ? easy : "N/A"}</span>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
          <span className="text-[10px] font-bold text-amber-400 block uppercase">Medium</span>
          <span className="font-extrabold text-sm text-foreground tabular-nums">{medium !== null ? medium : "N/A"}</span>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2">
          <span className="text-[10px] font-bold text-rose-400 block uppercase">Hard</span>
          <span className="font-extrabold text-sm text-foreground tabular-nums">{hard !== null ? hard : "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
