"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

function getAppOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  )
    .trim()
    .replace(/\/$/, "");
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getRedirectPath(userId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("users_profile")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    return data?.role === "admin" ? "/admin" : "/dashboard";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const fullName = String(formData.get("full_name") || "");
    const supabase = createClient();

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
              emailRedirectTo: `${getAppOrigin()}/auth/callback`,
            },
          });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    const userId = result.data.user?.id;
    const redirectPath = userId ? await getRedirectPath(userId) : "/dashboard";

    router.push(redirectPath);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "sign-up" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Full name</span>
          <Input name="full_name" placeholder="Avery Johnson" />
        </label>
      ) : null}
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink">Email</span>
        <Input name="email" type="email" placeholder="you@company.com" required />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink">Password</span>
        <Input name="password" type="password" minLength={6} required />
      </label>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        className="w-full text-center text-sm font-semibold text-primary-dark hover:text-primary"
      >
        {mode === "sign-in" ? "Create a new account" : "I already have an account"}
      </button>
    </form>
  );
}
