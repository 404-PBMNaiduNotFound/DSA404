"use client";

import React, { useState, useEffect } from "react";
import { registry } from "@/lib/coding-platforms/registry";
import { PlatformId } from "@/lib/coding-platforms/types";
import { detectPlatformAndUsername } from "@/lib/coding-platforms/detector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle2, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";

interface PlatformConnectCardProps {
  onConnect: (platform: PlatformId, username: string) => void;
  existingPlatforms: Record<string, string>;
}

export function PlatformConnectCard({ onConnect, existingPlatforms }: PlatformConnectCardProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("leetcode");
  const [detectedText, setDetectedText] = useState("");

  const allAdapters = registry.getAllAdapters();

  // When selected platform changes, pre-fill input with existing link/handle if present
  useEffect(() => {
    const existing = existingPlatforms[selectedPlatform];
    if (existing && typeof existing === "string") {
      setInputUrl(existing);
    } else {
      setInputUrl("");
    }
  }, [selectedPlatform, existingPlatforms]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputUrl(val);

    const detection = detectPlatformAndUsername(val);
    if (detection.platform !== "UNKNOWN") {
      setSelectedPlatform(detection.platform);
      setDetectedText(`Auto-detected: ${detection.platform.toUpperCase()} (${detection.username})`);
    } else {
      setDetectedText("");
    }
  };

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const plat = e.target.value as PlatformId;
    setSelectedPlatform(plat);
    setDetectedText("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const detection = detectPlatformAndUsername(inputUrl);
    const finalPlatform = detection.platform !== "UNKNOWN" ? detection.platform : selectedPlatform;
    const finalUsername = detection.username || inputUrl.trim();

    if (!finalUsername) {
      toast.error("Please enter a valid username or profile URL");
      return;
    }

    onConnect(finalPlatform, finalUsername);
    setDetectedText("");
    toast.success(`Saved ${finalPlatform.toUpperCase()} profile link!`);
  };

  const existingLink = existingPlatforms[selectedPlatform];

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-card/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Link2 className="size-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">Connect Coding Platform</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Auto URL Detection Enabled</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Select Platform</Label>
          <select
            value={selectedPlatform}
            onChange={handlePlatformChange}
            className="w-full h-10 rounded-xl bg-background/50 border border-white/10 px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {allAdapters.map((ad) => (
              <option key={ad.id} value={ad.id} className="bg-popover text-popover-foreground">
                {ad.name} {existingPlatforms[ad.id] ? "✓ (Connected)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Username or Profile URL</Label>
          <div className="flex items-center gap-2">
            <Input
              value={inputUrl}
              onChange={handleInputChange}
              placeholder="e.g. leetcode.com/u/john_doe, linkedin.com/in/john_doe, or handle"
              className="bg-background/40 border-white/10 rounded-xl text-xs h-10"
            />
            <Button type="submit" size="sm" className="h-10 rounded-xl px-4 gap-1.5 shrink-0 font-bold">
              <Plus className="size-4" /> Save Link
            </Button>
          </div>
        </div>
      </div>

      {/* Connection Status & Auto-Detection Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
        {detectedText ? (
          <p className="text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="size-3.5" /> {detectedText}
          </p>
        ) : existingLink && typeof existingLink === "string" ? (
          <p className="text-emerald-400/90 font-medium flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-emerald-400" /> Currently Connected: <span className="font-mono underline">{existingLink}</span>
          </p>
        ) : (
          <p className="text-muted-foreground/60 italic text-[11px]">
            Paste full profile URL or handle to auto-detect and fetch statistics.
          </p>
        )}
      </div>
    </form>
  );
}
