import { PageSkeleton } from "@/components/ui/skeleton";
import { DelayedSkeleton } from "@/components/ui/DelayedSkeleton";

export default function StaffLoading() {
  return (
    <DelayedSkeleton delay={280}>
      <PageSkeleton />
    </DelayedSkeleton>
  );
}
