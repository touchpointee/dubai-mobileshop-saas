import { DashboardSkeleton } from "@/components/ui/skeleton";
import { DelayedSkeleton } from "@/components/ui/DelayedSkeleton";

export default function OwnerLoading() {
  return (
    <DelayedSkeleton delay={280}>
      <DashboardSkeleton />
    </DelayedSkeleton>
  );
}
