"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNavigationStore } from "@/stores/navigation-store";

export function NavigationProgress() {
  const pathname = usePathname();
  const isNavigating = useNavigationStore((s) => s.isNavigating);
  const setNavigating = useNavigationStore((s) => s.setNavigating);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setNavigating(false);
    }
  }, [pathname, setNavigating]);

  useEffect(() => {
    if (!isNavigating) return;
    const fallback = setTimeout(() => setNavigating(false), 8000);
    return () => clearTimeout(fallback);
  }, [isNavigating, setNavigating]);

  if (!isNavigating) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[9999] h-[3px] bg-teal-500 overflow-hidden"
      role="progressbar"
      aria-valuetext="Loading"
    >
      <div className="h-full w-full animate-navigation-progress bg-teal-400/80" />
    </div>
  );
}
