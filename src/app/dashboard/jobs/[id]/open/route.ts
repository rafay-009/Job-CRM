import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("job_results")
    .select("id, job_link")
    .eq("id", id)
    .maybeSingle();

  if (error || !job?.job_link) {
    redirect("/dashboard");
  }

  await supabase.from("applied_job_clicks").upsert(
    {
      user_id: profile.id,
      job_id: job.id,
      applied_on: todayKey(),
      clicked_at: new Date().toISOString(),
    },
    { onConflict: "user_id,job_id,applied_on" },
  );

  redirect(job.job_link);
}
