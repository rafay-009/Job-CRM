import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

export async function getCurrentUser() {
  if (!hasSupabaseConfig()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as UserProfile;

  const fallbackProfile: UserProfile = {
    id: user.id,
    email: user.email || null,
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    role: "worker",
    created_at: new Date().toISOString(),
  };

  const { data: createdProfile } = await supabase
    .from("users_profile")
    .insert({
      id: user.id,
      email: user.email,
      full_name: fallbackProfile.full_name || "",
      role: "worker",
    })
    .select("*")
    .maybeSingle();

  return (createdProfile as UserProfile | null) || fallbackProfile;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}

export async function requireScraper() {
  const profile = await requireProfile();
  if (profile.role !== "scraper" && profile.role !== "admin") redirect("/dashboard");
  return profile;
}
