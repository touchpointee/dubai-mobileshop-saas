import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { MainContentWithSkeleton } from "@/components/layout/MainContentWithSkeleton";

export default async function NonVatShopStaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "NON_VAT_SHOP_STAFF") {
    redirect("/login");
  }
  return (
    <div className="flex h-screen min-h-0 bg-slate-50">
      <NavigationProgress />
      <AppSidebar role="NON_VAT_SHOP_STAFF" />
      <main className="min-h-0 flex-1 overflow-auto">
        <MainContentWithSkeleton>{children}</MainContentWithSkeleton>
      </main>
    </div>
  );
}
