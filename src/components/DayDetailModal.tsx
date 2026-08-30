"use client";

import { useState } from "react";
import { X, ExternalLink, Code2, CheckCircle2 } from "lucide-react";
import { CodeModal } from "@/components/CodeModal";

interface DayDetailModalProps {
  date: string;
  problems: any[];
  onClose: () => void;
}

export function DayDetailModal({ date, problems, onClose }: DayDetailModalProps) {
  const [selectedProblem, setSelectedProblem] = useState<any | null>(null);

  const formattedDate = (() => {
    try {
      const [year, month, day] = date.split("-").map(Number);
      if (year && month && day) {
        return new Date(year, month - 1, day).toLocaleDateString(undefined, {
          dateStyle: "full",
        });
      }
      return new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });
    } catch {
      return date;
    }
  })();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
        <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-400" />
                Solved Problems on {formattedDate}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                {problems.length} problem{problems.length === 1 ? "" : "s"} completed
              </p>
            </div>
            <button
              className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {problems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">No submissions recorded for this day.</p>
            ) : (
              problems.map((p, i) => {
                const submissionUrl = typeof p.submissionLink === "string" && p.submissionLink.trim() ? p.submissionLink.trim() : null;
                const hasCodeOrPoints = Boolean(p.code || p.keyPoints);

                return (
                  <div key={i} className="flex flex-col rounded-2xl border border-white/10 bg-background/50 p-3.5 space-y-2 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-foreground">{p.name ?? "Problem"}</span>
                      {p.platform && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
                          {p.platform}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs">
                      {/* ONLY show submission link if a submission link was actually submitted in view code modal */}
                      {submissionUrl && (
                        <a
                          href={submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 text-[11px] font-semibold transition-colors"
                        >
                          <ExternalLink className="size-3" />
                          View Submission Link
                        </a>
                      )}

                      {/* View Code / Solution button */}
                      {hasCodeOrPoints && (
                        <button
                          type="button"
                          onClick={() => setSelectedProblem(p)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 text-[11px] font-bold transition-colors ml-auto"
                        >
                          <Code2 className="size-3.5" />
                          View Code
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedProblem && (
        <CodeModal
          open={!!selectedProblem}
          onOpenChange={(open) => !open && setSelectedProblem(null)}
          problemName={selectedProblem.name ?? ""}
          existingSubmission={{
            code: selectedProblem.code ?? "",
            link: selectedProblem.submissionLink ?? "",
            keyPoints: selectedProblem.keyPoints ?? "",
            submittedAt: "",
          }}
          onSave={async () => {}}
          readOnly={true}
        />
      )}
    </>
  );
}
