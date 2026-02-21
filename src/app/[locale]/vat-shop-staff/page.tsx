import { redirect } from "next/navigation";

export default async function VatShopStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/vat-shop-staff/pos`);
}
