import { PageSkeleton } from "@/components/ui/skeleton";
import { DelayedSkeleton } from "@/components/ui/DelayedSkeleton";

export default function NonVatLoading() {
  return (
    <DelayedSkeleton delay={280}>
      <PageSkeleton />
    </DelayedSkeleton>
  );
}
