import { redirect } from "next/navigation";

export default async function NonVatPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/non-vat/pos`);
}
