import { DealerDetailPageContent } from "@/components/shared/DealerDetailPageContent";

export default async function VatDealerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DealerDetailPageContent dealerId={id} />;
}
