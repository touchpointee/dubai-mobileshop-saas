import { redirect } from "next/navigation";

export default async function SuperAdminPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/super-admin/dashboard`);
}
