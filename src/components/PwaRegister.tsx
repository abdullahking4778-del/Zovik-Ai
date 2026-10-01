"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __pwaInstallPrompt?: any;
  }
}

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker for PWA install eligibility
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Zovik PWA ServiceWorker active"))
        .catch((err) => console.warn("PWA SW registration:", err));
    }

    // Capture install prompt event globally
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
      window.dispatchEvent(new CustomEvent("zovik_pwa_ready"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  return null;
}
