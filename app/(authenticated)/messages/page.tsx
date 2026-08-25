"use client";

import { useEffect, useState } from "react";
import { auth, db as firestore } from "@/integrations/firebase/client";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Bell,
  Send,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  ShieldCheck,
  Megaphone,
  Radio,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface BroadcastMessage {
  id: string;
  title: string;
  body: string;
  url?: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  status: "sending" | "published" | "failed";
  sentAt?: string;
  tokensFound?: number;
  successCount?: number;
  failureCount?: number;
  invalidTokensRemoved?: number;
}

const ADMIN_EMAILS = ["404dsatracker@gmail.com"];

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for admin
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/today");
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastStats, setLastStats] = useState<{
    tokensFound: number;
    successCount: number;
    failureCount: number;
    invalidTokensRemoved: number;
  } | null>(null);

  const isAdmin = Boolean(
    user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  );

  async function loadMessages() {
    if (!firestore) return;
    try {
      const q = query(collection(firestore, "messages"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: BroadcastMessage[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<BroadcastMessage, "id">),
      }));
      setMessages(list);
    } catch (err) {
      console.warn("[messages] Failed to load messages from Firestore:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
  }, []);

  async function handlePublish() {
    if (!title.trim() || !body.trim()) {
      toast.error("Please enter both a title and message body.");
      return;
    }

    setIsPublishing(true);
    setLastStats(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("Not authenticated", { description: "Please log in first." });
        return;
      }

      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/campaigns/publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || "/messages",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error("Broadcast Failed", {
          description: data.message || "Could not publish campaign notification.",
        });
        return;
      }

      const stats = {
        tokensFound: data.tokensFound || 0,
        successCount: data.successCount || 0,
        failureCount: data.failureCount || 0,
        invalidTokensRemoved: data.invalidTokensRemoved || 0,
      };

      setLastStats(stats);
      toast.success("Broadcast Published! 🚀", {
        description: `Delivered to ${stats.successCount}/${stats.tokensFound} subscribed device(s).`,
      });

      // Clear form & reload list
      setTitle("");
      setBody("");
      setUrl("/today");
      await loadMessages();
    } catch (err: any) {
      console.error("Error publishing message:", err);
      toast.error("Network / Server Error", {
        description: err?.message || String(err),
      });
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Megaphone className="size-5" />
              </span>
              <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-foreground">
                Messages & Alerts
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">
              Official platform announcements, features updates, and broadcast alerts from the DSA⁴⁰⁴ team.
            </p>
          </div>

          {isAdmin && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 self-start md:self-auto">
              <ShieldCheck className="size-4" />
              <span>Admin Broadcast Mode Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Admin Broadcast Creator (Restricted to Authorized Admins) */}
      {isAdmin && (
        <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Radio className="size-5 text-primary animate-pulse" />
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Create & Broadcast Announcement
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">Targeting: All Registered FCM Tokens</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="msg-title" className="text-sm font-semibold">
                Announcement Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="msg-title"
                placeholder="e.g. 🏆 Weekly Coding Contest starting in 1 hour!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="msg-body" className="text-sm font-semibold">
                Message Body <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="msg-body"
                rows={3}
                placeholder="Write your announcement details here. Keep it concise for push notifications..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="msg-url" className="text-sm font-semibold">
                Target Link (Optional)
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="msg-url"
                  placeholder="/contests or https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Sends an instant push alert to all devices (foreground, background, and closed-app Web Push).
              </p>
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    disabled={isPublishing || !title.trim() || !body.trim()}
                    className="gap-2 px-5 font-semibold"
                  >
                    {isPublishing ? (
                      <>
                        <Sparkles className="size-4 animate-spin" />
                        Broadcasting...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Publish & Notify 🔔
                      </>
                    )}
                  </Button>
                }
                title="Broadcast Notification Campaign?"
                description={`You are about to send this push notification to all subscribed devices:\n\nTitle: "${title}"\nBody: "${body}"\n\nAre you sure you want to broadcast now?`}
                confirmLabel="Yes, Broadcast Now 🚀"
                onConfirm={handlePublish}
              />
            </div>
          </div>

          {/* Last Broadcast Statistics Summary */}
          {lastStats && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs space-y-2 animate-fade-in">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="size-4" /> Broadcast Delivered Successfully
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-foreground font-mono">
                <div>Tokens Found: <strong>{lastStats.tokensFound}</strong></div>
                <div>Notifications Sent: <strong className="text-emerald-600 dark:text-emerald-400">{lastStats.successCount}</strong></div>
                <div>Failed Sends: <strong className="text-amber-600">{lastStats.failureCount}</strong></div>
                <div>Tokens Pruned: <strong>{lastStats.invalidTokensRemoved}</strong></div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Announcements & Messages Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            Announcement History & Feed
          </h2>
          <span className="text-xs text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
              <Megaphone className="size-6 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground">No Announcements Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Platform news, updates, and contest reminders will appear here when published.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className="group relative rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                      {msg.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      {msg.createdByName && (
                        <>
                          <span>•</span>
                          <span>By {msg.createdByName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isAdmin && msg.successCount !== undefined && (
                    <div className="shrink-0 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                      Delivered: <span className="font-bold text-foreground">{msg.successCount}</span> / {msg.tokensFound ?? 0}
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {msg.body}
                </p>

                {msg.url && (
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                    <a
                      href={msg.url}
                      target={msg.url.startsWith("http") ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      View Details / Link
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
