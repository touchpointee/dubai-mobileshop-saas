"use client";

import { useNavigationStore } from "@/stores/navigation-store";
import { PageSkeleton } from "@/components/ui/skeleton";

export function MainContentWithSkeleton({ children }: { children: React.ReactNode }) {
  const isNavigating = useNavigationStore((s) => s.isNavigating);
  if (isNavigating) return <PageSkeleton />;
  return <>{children}</>;
}
