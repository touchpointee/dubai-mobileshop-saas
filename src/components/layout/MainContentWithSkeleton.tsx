"use client";

import { useState, useEffect } from "react";
import { useNavigationStore } from "@/stores/navigation-store";
import { PageSkeleton } from "@/components/ui/skeleton";

/** Only show skeleton if navigation takes longer than this (ms). Fast navigations feel instant. */
const SKELETON_DELAY_MS = 280;

export function MainContentWithSkeleton({ children }: { children: React.ReactNode }) {
  const isNavigating = useNavigationStore((s) => s.isNavigating);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isNavigating) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  if (isNavigating && showSkeleton) return <PageSkeleton />;
  return <>{children}</>;
}
