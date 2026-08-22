"use client";

import { usePWAInstall } from "@/hooks/usePWAInstall";
import { ChromeInstallModal } from "@/components/ChromeInstallModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Smartphone,
  CheckCircle2,
  Zap,
  Bell,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from "lucide-react";

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


export function InstallApkSection() {
  const {
    canInstall,
    isStandalone,
    isIOS,
    promptInstall,
    downloadApk,
    launchApp,
    isModalOpen,
    setIsModalOpen,
  } = usePWAInstall();

  return (
    <section className="relative my-14 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-card/90 via-card to-card/60 p-6 sm:p-10 shadow-xl backdrop-blur-md">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Info Column */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono text-primary font-medium">
            <ChromeIcon className="size-3.5" />
            Chrome Web APK & Mobile App
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
            Install DSA404 directly from <span className="text-primary">Google Chrome</span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Get the full native application experience on Android, Windows, Mac, or iOS.
            Launch directly from your home screen or desktop with zero browser clutter and ultra-fast loading.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
              <Zap className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-foreground font-mono">1-Click Chrome Install</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Install natively via Web APK without APK permissions hassle.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
              <Bell className="size-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-foreground font-mono">Daily Practice Alerts</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Never break your streak with background push reminders.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
              <Smartphone className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-foreground font-mono">Native Mobile Frame</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Full screen mode tuned specifically for mobile DSA practice.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
              <ShieldCheck className="size-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-foreground font-mono">Direct APK Fallback</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Download standalone APK file anytime for instant installation.</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isStandalone ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                <Button
                  onClick={launchApp}
                  size="lg"
                  className="font-mono text-xs sm:text-sm font-semibold justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="size-4" />
                  App Installed · Open App
                </Button>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  variant="outline"
                  size="lg"
                  className="font-mono text-xs sm:text-sm justify-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <ChromeIcon className="size-4" />
                  Re-install App / Guide
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={promptInstall}
                  size="lg"
                  className="font-mono text-xs sm:text-sm font-semibold justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <ChromeIcon className="size-4" />
                  Install App from Chrome
                </Button>
                <Button
                  onClick={downloadApk}
                  variant="outline"
                  size="lg"
                  className="font-mono text-xs sm:text-sm justify-center gap-2"
                >
                  <Download className="size-4" />
                  Download APK File
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Right Preview Card Column */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl overflow-hidden border border-border shadow-sm ring-1 ring-primary/20">
                  <img src="/logo.jpg" alt="DSA404 App" className="size-full object-cover" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold leading-none">DSA⁴⁰⁴ App</h3>
                  <span className="text-[11px] font-mono text-muted-foreground">Chrome Web APK v2.4</span>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20">
                PWA Certified
              </Badge>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-border/30 text-muted-foreground">
                <span>Installation Source</span>
                <span className="text-foreground font-semibold">Chrome WebAPK</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/30 text-muted-foreground">
                <span>Storage Required</span>
                <span className="text-foreground font-semibold">&lt; 2 MB</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/30 text-muted-foreground">
                <span>Push Notifications</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Enabled
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-muted-foreground">
                <span>Direct APK File</span>
                <span className="text-primary font-semibold">DSA404-App.apk</span>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="size-3.5" />
              View Installation Guide
            </button>
          </div>
        </div>
      </div>

      <ChromeInstallModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onDownloadApk={downloadApk}
        onLaunchApp={launchApp}
        isIOS={isIOS}
        isStandalone={isStandalone}
      />
    </section>
  );
}
