import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { MainContentWithSkeleton } from "@/components/layout/MainContentWithSkeleton";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    redirect("/login");
  }
  return (
    <div className="flex h-screen min-h-0 bg-slate-50">
      <NavigationProgress />
      <AppSidebar role="OWNER" />
      <main className="min-h-0 flex-1 overflow-auto">
        <MainContentWithSkeleton>{children}</MainContentWithSkeleton>
      </main>
    </div>
  );
}
