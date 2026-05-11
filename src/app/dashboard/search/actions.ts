"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireScraper } from "@/lib/auth";
import { processScrapeRun } from "@/lib/scraper/pipeline";

export type SearchActionState = {
  error?: string;
};

function parseUrls(value: string) {
  return value
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
}

export async function submitSearch(
  _state: SearchActionState,
  formData: FormData,
): Promise<SearchActionState> {
  const profile = await requireScraper();
  const supabase = await createClient();

  const techStack = String(formData.get("tech_stack") || "");
  const keyword = String(formData.get("keyword") || "").trim();
  const urls = parseUrls(String(formData.get("source_urls") || ""));

  if (!techStack || !keyword || urls.length === 0) {
    return { error: "Fill in every field and add at least one source URL." };
  }

  const { data: run, error } = await supabase
    .from("scrape_runs")
    .insert({
      user_id: profile.id,
      tech_stack: techStack,
      keyword,
      region: "",
      time_filter: "",
      source_urls: urls,
      status: "pending",
      error_message: null,
    })
    .select("id,user_id,tech_stack,keyword,source_urls")
    .single();

  if (error || !run) {
    return { error: error?.message || "Could not create scrape run." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  after(() =>
    processScrapeRun({
      id: run.id,
      user_id: run.user_id,
      tech_stack: run.tech_stack,
      keyword: run.keyword,
      source_urls: run.source_urls as string[],
      user_access_token: session?.access_token,
    }),
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  redirect(`/dashboard/results?run_id=${run.id}`);
}
