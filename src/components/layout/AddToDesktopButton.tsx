"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";

const ICON_SIZE = 20;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function AddToDesktopButton() {
  const t = useTranslations("nav");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, [mounted]);

  const handleClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setDeferredPrompt(null);
      } catch {
        setShowHint(true);
      }
    } else {
      setShowHint(true);
    }
  };

  useEffect(() => {
    if (!showHint) return;
    const close = (e: MouseEvent) => {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) setShowHint(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showHint]);

  if (!mounted || isStandalone) return null;

  return (
    <div className="relative" ref={hintRef}>
      <button
        type="button"
        onClick={handleClick}
        className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <Download size={ICON_SIZE} className="flex-shrink-0" />
        {t("addToDesktop")}
      </button>
      {showHint && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 max-w-[320px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-slate-700">{t("addToDesktopHintMenu")}</p>
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
