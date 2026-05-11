import { Sidebar } from "@/components/sidebar";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[18rem_1fr]">
      <div className="hidden lg:block">
        <Sidebar profile={profile} />
      </div>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
