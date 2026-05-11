import Link from "next/link";
import { Briefcase, CalendarDays, CheckCircle2, Clock, ExternalLink, Search, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { techStackOptions } from "@/lib/tech-stacks";
import { formatDate } from "@/lib/utils";
import type { AppliedJobClick, JobResult, ScrapeRun } from "@/lib/types";

type DashboardSearchParams = {
  tech_stack?: string;
  date?: string;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function jobSavedDate(job: JobResult) {
  return job.created_at.slice(0, 10);
}

function shortUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

function filterJobs(jobs: JobResult[], filters: Required<DashboardSearchParams>) {
  return jobs.filter((job) => {
    const techStackMatches = !filters.tech_stack || job.tech_stack === filters.tech_stack;
    const dateMatches = !filters.date || jobSavedDate(job) === filters.date;

    return techStackMatches && dateMatches;
  });
}

async function WorkerDashboard({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const profile = await requireProfile();
  const params = await searchParams;
  const filters = {
    tech_stack: params.tech_stack || "",
    date: params.date || todayKey(),
  };
  const supabase = await createClient();
  const today = todayKey();

  const [
    { data: jobsData, error: jobsError },
    { data: todayClicksData, error: clicksError },
  ] = await Promise.all([
    supabase.from("job_results").select("*").order("created_at", { ascending: false }).limit(500),
    supabase
      .from("applied_job_clicks")
      .select("*")
      .eq("user_id", profile.id)
      .eq("applied_on", today),
  ]);

  const jobs = filterJobs((jobsData || []) as JobResult[], filters);
  const todayClicks = (todayClicksData || []) as AppliedJobClick[];
  const appliedJobIds = new Set(todayClicks.map((click) => click.job_id));
  const techOptions = [{ label: "All tech stacks", value: "" }, ...techStackOptions];
  const error = jobsError || clicksError;

  return (
    <section>
      <PageHeader
        title="Job Links"
        description="Filter scraper-provided jobs by tech stack and date, then open links as you apply."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Applied Today" value={todayClicks.length} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Visible Links" value={jobs.length} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard label="Selected Day" value={filters.date} icon={<CalendarDays className="h-5 w-5" />} />
      </div>

      <form className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Tech stack</span>
            <Select name="tech_stack" options={techOptions} defaultValue={filters.tech_stack} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Saved date</span>
            <Input name="date" type="date" defaultValue={filters.date} />
          </label>
          <Button type="submit">
            <Search className="h-4 w-4" />
            Apply
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-8">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error.message}. Run the latest SQL in <span className="font-semibold">supabase/schema.sql</span>.
          </div>
        ) : (
          <DataTable
            data={jobs}
            emptyMessage="No scraper-provided job links match this selection."
            columns={[
              {
                key: "job_title",
                header: "Job Title",
                cell: (job) => (
                  <div>
                    <p className="max-w-80 truncate font-semibold">{job.job_title}</p>
                    <p className="mt-1 text-xs font-medium text-muted">{shortUrl(job.job_link)}</p>
                  </div>
                ),
              },
              { key: "company", header: "Company", cell: (job) => job.company },
              { key: "tech_stack", header: "Tech Stack", cell: (job) => job.tech_stack || "Unavailable" },
              { key: "posted_time", header: "Posted", cell: (job) => job.posted_time || "Unknown" },
              { key: "saved", header: "Saved", cell: (job) => formatDate(job.created_at) },
              {
                key: "applied",
                header: "Applied",
                cell: (job) => (
                  <StatusBadge status={appliedJobIds.has(job.id) ? "applied" : "new"} />
                ),
              },
              {
                key: "open",
                header: "Open",
                cell: (job) => (
                  <a
                    href={`/dashboard/jobs/${job.id}/open`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary-dark hover:text-primary"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ),
              },
            ]}
          />
        )}
      </div>
    </section>
  );
}

async function ScraperDashboard() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [
    { count: runsCount, error: runsCountError },
    { count: jobsCount, error: jobsCountError },
    { data: recentRuns, error: recentRunsError },
  ] = await Promise.all([
    supabase.from("scrape_runs").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("job_results").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase
      .from("scrape_runs")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const runs = (recentRuns || []) as ScrapeRun[];
  const error = runsCountError || jobsCountError || recentRunsError;

  return (
    <section>
      <PageHeader
        title="Scraper Dashboard"
        description="Run the scraper and monitor the jobs you have added for workers."
        action={
          <Link href="/dashboard/search">
            <Button>
              <Search className="h-4 w-4" />
              New scrape
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Runs" value={runsCount || 0} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Saved Jobs" value={jobsCount || 0} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard
          label="Latest Results"
          value={runs[0]?.total_results || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-ink">Recent runs</h2>
        {error ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error.message}. Run the SQL in <span className="font-semibold">supabase/schema.sql</span>.
          </div>
        ) : (
          <DataTable
            data={runs}
            emptyMessage="No scrape runs yet. Start a scrape to create your first run."
            columns={[
              { key: "keyword", header: "Keyword", cell: (run) => run.keyword },
              { key: "tech_stack", header: "Tech Stack", cell: (run) => run.tech_stack },
              { key: "total_results", header: "Results", cell: (run) => run.total_results },
              { key: "status", header: "Status", cell: (run) => <StatusBadge status={run.status} /> },
              { key: "created_at", header: "Created", cell: (run) => formatDate(run.created_at) },
            ]}
          />
        )}
      </div>
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const profile = await requireProfile();

  if (profile.role === "scraper" || profile.role === "admin") {
    return <ScraperDashboard />;
  }

  return <WorkerDashboard searchParams={searchParams} />;
}
