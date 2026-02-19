import { redirect } from "next/navigation";

export default async function VatPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/vat/pos`);
}
