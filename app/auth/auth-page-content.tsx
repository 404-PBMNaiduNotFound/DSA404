"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, User as UserIcon, AtSign, Mail, Lock } from "lucide-react";
import {
  claimUsername,
  getEmailByUsername,
  isUsernameAvailable,
  normalizeUsername,
  saveUserProfile,
  USERNAME_REGEX,
} from "@/lib/db";

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

/** Firebase's auth/* error codes -> user-friendly messages. */
function authErrorMessage(e: unknown): string {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email/username or password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 8 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      default:
        return e.message || "An error occurred";
    }
  }
  return String(e || "An error occurred");
}

export function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/today";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Debounced live availability check as the user types their handle during sign-up
  useEffect(() => {
    if (mode !== "signup") return;
    const raw = username.trim();
    if (!raw) {
      setUsernameStatus("idle");
      return;
    }
    const u = normalizeUsername(raw);
    if (!USERNAME_REGEX.test(u)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(u);
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username, mode]);

  async function proceedAfterAuth(user: User, successMessage?: { title: string; description?: string }) {
    if (successMessage) toast.success(successMessage.title, { description: successMessage.description });
    router.push(next);
  }

  async function handleSignIn() {
    if (!auth) {
      toast.error("Firebase not initialized. Check your configuration.");
      return;
    }

    const identifier = email.trim();
    if (!identifier) {
      toast.error("Please enter your email or username.");
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(e.issues[0]?.message ?? "Invalid password.");
      }
      return;
    }

    setBusy(true);
    try {
      let targetEmail = identifier;
      // If identifier doesn't contain '@', resolve it as a username
      if (!identifier.includes("@")) {
        const resolved = await getEmailByUsername(identifier);
        if (!resolved) {
          toast.error("No account found with that username.");
          setBusy(false);
          return;
        }
        targetEmail = resolved;
      }

      const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
      await proceedAfterAuth(cred.user, {
        title: "Welcome back! Thanks for logging in to our website.",
        description: "Ready to solve today's DSA problems?",
      });
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    if (!auth) {
      toast.error("Firebase not initialized. Check your configuration.");
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    const u = normalizeUsername(username);

    // 1. Validate full name
    if (!trimmedName) {
      toast.error("Please enter your full name.");
      return;
    }

    // 2. Validate username
    if (!u) {
      toast.error("Please choose a username.");
      return;
    }
    if (!USERNAME_REGEX.test(u)) {
      toast.error("Username must be 3-20 characters: lowercase letters, numbers, - or _ only.");
      return;
    }

    // 3. Validate email & password
    try {
      emailSchema.parse(trimmedEmail);
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(e.issues[0]?.message ?? "Invalid input.");
      }
      return;
    }

    setBusy(true);
    try {
      // Re-verify username availability before creating account
      const available = await isUsernameAvailable(u);
      if (!available) {
        toast.error("That username is already taken. Please choose another.");
        setUsernameStatus("taken");
        setBusy(false);
        return;
      }

      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      // Claim the username and store email for username login
      await claimUsername(cred.user.uid, u, trimmedEmail);

      // Save user display name and profile
      await saveUserProfile(cred.user.uid, { displayName: trimmedName });
      try {
        await updateProfile(cred.user, { displayName: trimmedName });
      } catch {}

      await proceedAfterAuth(cred.user, {
        title: "Account created successfully! 🎉",
        description: `Welcome @${u}! Let's set up your plan.`,
      });
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!auth) {
      toast.error("Firebase not initialized. Check your configuration.");
      return;
    }

    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await proceedAfterAuth(cred.user, {
        title: "Welcome back! Thanks for logging in to our website.",
        description: "Ready to solve today's DSA problems?",
      });
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!auth) {
      toast.error("Firebase not initialized. Check your configuration.");
      return;
    }
    const identifier = email.trim();
    if (!identifier) {
      toast.error("Enter your email or username above first, then click Forgot password.");
      return;
    }
    setBusy(true);
    try {
      let targetEmail = identifier;
      if (!identifier.includes("@")) {
        const resolved = await getEmailByUsername(identifier);
        if (!resolved) {
          toast.error("No account found with that username.");
          setBusy(false);
          return;
        }
        targetEmail = resolved;
      }
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSent(true);
      toast.success(`Reset email sent to ${targetEmail} — check your inbox.`);
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.push(next);
    });
    return () => unsub();
  }, [router, next]);

  const usernameIcon =
    usernameStatus === "checking" ? (
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
    ) : usernameStatus === "available" ? (
      <Check className="size-4 text-emerald-500" />
    ) : usernameStatus === "taken" || usernameStatus === "invalid" ? (
      <X className="size-4 text-destructive" />
    ) : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to home
        </Link>
        <Card className="w-full max-w-md border-border bg-card shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2.5 mb-1">
              <div className="size-8 rounded-full overflow-hidden border border-border/80 shadow-md ring-1 ring-primary/20 bg-background shrink-0">
                <img src="/logo.jpg" alt="DSA404 Logo" className="size-full object-cover" />
              </div>
              <div className="font-display font-black tracking-tighter text-2xl leading-none flex items-baseline select-none">
                <span className="bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent drop-shadow-sm">DSA</span>
                <span className="bg-gradient-to-br from-primary to-orange-500 bg-clip-text text-transparent drop-shadow-sm ml-[1px]">⁴⁰⁴</span>
              </div>
            </div>
            <CardDescription className="text-sm">
              {mode === "signin" ? "Sign in to track your DSA roadmap" : "Create your account & personalised plan"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email">Account</TabsTrigger>
                <TabsTrigger value="google">Google</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-3.5">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="full-name">Full Name</Label>
                      <Input
                        id="full-name"
                        type="text"
                        placeholder="e.g. Alex Turner"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={busy}
                        maxLength={60}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-username">Username</Label>
                      <div className="relative">
                        <Input
                          id="signup-username"
                          type="text"
                          placeholder="e.g. alex_turner"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={busy}
                          className={
                            usernameStatus === "taken" || usernameStatus === "invalid"
                              ? "border-destructive focus-visible:ring-destructive pr-9"
                              : usernameStatus === "available"
                                ? "border-emerald-500 focus-visible:ring-emerald-500 pr-9"
                                : "pr-9"
                          }
                        />
                        {usernameIcon && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameIcon}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] ${
                          usernameStatus === "taken" || usernameStatus === "invalid"
                            ? "text-destructive"
                            : usernameStatus === "available"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {usernameStatus === "taken"
                          ? "That username is already taken — choose another."
                          : usernameStatus === "invalid"
                            ? "3-20 characters: lowercase letters, numbers, - or _ only."
                            : usernameStatus === "available"
                              ? "Username is available!"
                              : "Your unique handle for login and public profile."}
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email">{mode === "signin" ? "Email or Username" : "Email"}</Label>
                  <Input
                    id="email"
                    type={mode === "signin" ? "text" : "email"}
                    placeholder={mode === "signin" ? "your@example.com or username" : "your@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                </div>

                <Button
                  className="w-full mt-2"
                  disabled={busy || (mode === "signup" && usernameStatus === "taken")}
                  onClick={mode === "signin" ? handleSignIn : handleSignUp}
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </Button>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setUsernameStatus("idle");
                    }}
                  >
                    {mode === "signin"
                      ? "Don't have an account? Sign up"
                      : "Already have an account? Sign in"}
                  </button>

                  {mode === "signin" && (
                    resetSent ? (
                      <p className="text-center text-xs text-success">
                        ✓ Reset email sent — check your inbox.
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-xs text-primary hover:underline disabled:opacity-50 cursor-pointer"
                        disabled={busy}
                        onClick={handleForgotPassword}
                      >
                        Forgot password?
                      </button>
                    )
                  )}
                </div>
              </TabsContent>

              <TabsContent value="google" className="pt-2">
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={busy}
                  onClick={handleGoogleSignIn}
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in with Google
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}