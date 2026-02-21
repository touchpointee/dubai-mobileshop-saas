import { redirect } from "next/navigation";

export default async function NonVatShopStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/non-vat-shop-staff/pos`);
}
