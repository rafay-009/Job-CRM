import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";
import logo from "@/lib/logo.png";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = hasSupabaseConfig();
  const user = configured ? await getCurrentUser() : null;
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-8">
          <div className="mb-5 flex h-16 w-25 items-center justify-center overflow-hidden rounded-md bg-white">
            <Image
              src={logo}
              alt="Mavericks United logo"
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-ink">Sign in to Mavericks United</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Access your enterprise job scraping dashboard.
          </p>
        </div>
        {configured ? (
          <LoginForm />
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Add `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or
            `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`, then restart the dev server.
          </div>
        )}
      </section>
    </main>
  );
}
