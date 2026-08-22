"use client";

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check standalone / PWA installed state
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Browser detection
    const ua = navigator.userAgent;
    const isIOSDevice = /iPhone|iPad|iPod/i.test(ua);
    const isAndroidDevice = /Android/i.test(ua);
    const isChromeBrowser = /Chrome/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsChrome(isChromeBrowser);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const launchApp = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/today";
    }
  }, []);

  const promptInstall = useCallback(async () => {
    if (isStandalone) {
      launchApp();
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          setDeferredPrompt(null);
          setIsStandalone(true);
        }
      } catch (err) {
        console.error("Error triggering install prompt:", err);
      }
    } else {
      // Fallback: open Chrome install modal instructions
      setIsModalOpen(true);
    }
  }, [deferredPrompt, isStandalone, launchApp]);

  const downloadApk = useCallback(() => {
    // If browser prompt available, prompt app install directly
    if (deferredPrompt) {
      deferredPrompt.prompt().catch(() => {
        setIsModalOpen(true);
      });
      return;
    }

    // Trigger download & open install guide modal immediately
    const link = document.createElement("a");
    link.href = "/api/download-apk";
    link.download = "DSA404-App.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsModalOpen(true);
  }, [deferredPrompt]);



  return {
    canInstall: Boolean(deferredPrompt),
    isStandalone,
    isIOS,
    isAndroid,
    isChrome,
    promptInstall,
    downloadApk,
    launchApp,
    isModalOpen,
    setIsModalOpen,
  };
}
