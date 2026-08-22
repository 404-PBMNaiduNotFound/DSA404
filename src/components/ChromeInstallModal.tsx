"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Share, PlusSquare, CheckCircle2, ShieldCheck } from "lucide-react";

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

interface ChromeInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunchApp?: () => void;
  isAndroid?: boolean;
  isIOS?: boolean;
  isStandalone?: boolean;
}

export function ChromeInstallModal({
  open,
  onOpenChange,
  onLaunchApp,
  isAndroid,
  isIOS,
  isStandalone,
}: ChromeInstallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2.5 text-primary font-mono text-xs font-semibold uppercase tracking-wider">
            <ChromeIcon className="size-4 text-primary" />
            Chrome PWA App Guide
          </div>
          <DialogTitle className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Install DSA404 App
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Follow these quick instructions to add DSA404 directly to your home screen or desktop as a Web App.
          </DialogDescription>
        </DialogHeader>

        {isStandalone && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold font-mono">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>App Already Installed!</span>
            </div>
            <Button
              onClick={() => {
                onOpenChange(false);
                if (onLaunchApp) onLaunchApp();
                else window.location.href = "/today";
              }}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs shrink-0"
            >
              Open App
            </Button>
          </div>
        )}

        <div className="mt-4 space-y-4 font-sans">
          {/* Verified Safe Notice */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[11px] uppercase font-mono text-emerald-500">100% Safe & Verified</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Runs directly in your Chrome browser. Not an APK file.</p>
            </div>
          </div>
          {/* Android Chrome Instructions */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Smartphone className="size-4 text-emerald-500" />
              <span>Android (Google Chrome)</span>
            </div>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
              <li>Open Chrome menu <strong className="text-foreground">(⋮)</strong> at top right.</li>
              <li>Tap <strong className="text-foreground">"Install app"</strong> (or <strong className="text-foreground">"Add to Home screen"</strong>).</li>
              <li>Confirm <strong className="text-foreground">"Install"</strong> to install it as a standalone application icon (not a browser shortcut widget).</li>
            </ol>
          </div>

          {/* Desktop Chrome Instructions */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Monitor className="size-4 text-blue-500" />
              <span>Desktop (Chrome / Edge)</span>
            </div>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
              <li>Look for the <strong className="text-foreground">Install App icon (⊕)</strong> right inside the address bar.</li>
              <li>Or click Chrome menu <strong className="text-foreground">(⋮) &gt; Save and share &gt; Install DSA404</strong>.</li>
              <li>Click <strong className="text-foreground">Install</strong> — it launches as a full standalone Application window.</li>
            </ol>
          </div>

          {/* Pro Tip note about Application vs Widget Shortcut */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs text-foreground/90 space-y-1">
            <span className="font-bold font-mono text-[11px] text-primary flex items-center gap-1">
              💡 Standalone Application Mode
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              When installing from the Chrome menu, choosing <strong>"Install app"</strong> installs DSA404 as a full, dedicated application on your device rather than a web browser shortcut widget.
            </p>
          </div>

          {/* iOS Safari Instructions */}
          {isIOS && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                <Share className="size-4" />
                <span>iOS (Safari / Chrome)</span>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
                <li>Tap the <strong className="text-foreground">Share button</strong> (box with arrow up).</li>
                <li>Scroll down and select <strong className="text-foreground font-semibold flex-inline items-center gap-1"><PlusSquare className="inline size-3" /> Add to Home Screen</strong>.</li>
              </ol>
            </div>
          )}

          {/* Key Advantages */}
          <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>Instant Launch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>Push Alerts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>Zero App Store required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>Full Screen UI</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto font-mono text-xs"
          >
            Close Guide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

