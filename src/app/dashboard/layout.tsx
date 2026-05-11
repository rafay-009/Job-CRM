import { Sidebar } from "@/components/sidebar";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[18rem_1fr]">
      <div className="hidden lg:block">
        <Sidebar profile={profile} />
      </div>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="mb-4 block lg:hidden">
          <Sidebar profile={profile} />
        </div>
        {children}
      </main>
    </div>
  );
}
