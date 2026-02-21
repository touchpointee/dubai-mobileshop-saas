import { ServiceJobDetailContent } from "@/components/shared/ServiceJobDetailContent";

export default async function VatShopStaffServiceJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ServiceJobDetailContent jobId={id} />;
}
