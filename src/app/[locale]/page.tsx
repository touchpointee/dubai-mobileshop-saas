import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ROLE_DEFAULT_PATH } from "@/lib/role-routes";
import { extractSubdomain } from "@/lib/subdomain";
import type { Role } from "@/lib/constants";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <LandingPage locale={locale} />;
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const defaultPath = ROLE_DEFAULT_PATH[session.user.role as Role] ?? "/login";
  redirect(`/${locale}${defaultPath}`);
}
