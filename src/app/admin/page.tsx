import Link from "next/link";
import { Briefcase, CheckCircle2, CircleAlert, Eye, Link2, ListChecks, Search, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { techStackOptions as searchTechStackOptions } from "@/lib/tech-stacks";
import { formatDate } from "@/lib/utils";
import type { AppliedJobClick, JobResult, ScrapeRun, UserProfile } from "@/lib/types";

type UserAnalytics = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  runs: number;
  jobs: number;
  failedRuns: number;
  completedRuns: number;
  appliedToday: number;
  appliedTotal: number;
  lastActivity: string | null;
};

type WorkerTechAnalytics = {
  techStack: string;
  appliedTotal: number;
  appliedToday: number;
  lastAppliedAt: string | null;
};

type ScraperTechAnalytics = {
  techStack: string;
  runs: number;
  completedRuns: number;
  failedRuns: number;
  savedJobs: number;
  scrapedLinks: number;
  lastRunAt: string | null;
};

type AppliedJobAnalytics = AppliedJobClick & {
  job: JobResult | null;
};

type AdminSearchParams = {
  user_id?: string;
  tech_stack?: string;
  date?: string;
};

function sourceUrlCount(run: ScrapeRun) {
  return Array.isArray(run.source_urls) ? run.source_urls.length : 0;
}

function runDate(run: ScrapeRun) {
  return run.created_at.slice(0, 10);
}

function filterRuns(runs: ScrapeRun[], filters: Required<AdminSearchParams>) {
  return runs.filter((run) => {
    const userMatches = !filters.user_id || run.user_id === filters.user_id;
    const stackMatches = !filters.tech_stack || run.tech_stack === filters.tech_stack;
    const dateMatches = !filters.date || runDate(run) === filters.date;

    return userMatches && stackMatches && dateMatches;
  });
}

function filterJobs(jobs: JobResult[], runs: ScrapeRun[]) {
  const runIds = new Set(runs.map((run) => run.id));

  return jobs.filter((job) => runIds.has(job.run_id));
}

function filterClicks(
  clicks: AppliedJobClick[],
  jobsById: Map<string, JobResult>,
  filters: Required<AdminSearchParams>,
) {
  return clicks.filter((click) => {
    const job = jobsById.get(click.job_id);
    const userMatches = !filters.user_id || click.user_id === filters.user_id;
    const stackMatches = !filters.tech_stack || job?.tech_stack === filters.tech_stack;
    const dateMatches = !filters.date || click.applied_on === filters.date;

    return userMatches && stackMatches && dateMatches;
  });
}

function buildWorkerTechAnalytics(
  clicks: AppliedJobClick[],
  jobsById: Map<string, JobResult>,
) {
  const today = new Date().toISOString().slice(0, 10);
  const stacks = new Map<string, WorkerTechAnalytics>();

  for (const click of clicks) {
    const job = jobsById.get(click.job_id);
    const techStack = job?.tech_stack || "Unavailable";
    const current =
      stacks.get(techStack) ||
      ({
        techStack,
        appliedTotal: 0,
        appliedToday: 0,
        lastAppliedAt: null,
      } satisfies WorkerTechAnalytics);

    current.appliedTotal += 1;
    if (click.applied_on === today) {
      current.appliedToday += 1;
    }
    if (!current.lastAppliedAt || new Date(click.clicked_at) > new Date(current.lastAppliedAt)) {
      current.lastAppliedAt = click.clicked_at;
    }

    stacks.set(techStack, current);
  }

  return Array.from(stacks.values()).sort((first, second) => second.appliedTotal - first.appliedTotal);
}

function buildScraperTechAnalytics(runs: ScrapeRun[]) {
  const stacks = new Map<string, ScraperTechAnalytics>();

  for (const run of runs) {
    const current =
      stacks.get(run.tech_stack) ||
      ({
        techStack: run.tech_stack,
        runs: 0,
        completedRuns: 0,
        failedRuns: 0,
        savedJobs: 0,
        scrapedLinks: 0,
        lastRunAt: null,
      } satisfies ScraperTechAnalytics);

    current.runs += 1;
    current.savedJobs += run.total_results || 0;
    current.scrapedLinks += sourceUrlCount(run);
    if (run.status === "completed") {
      current.completedRuns += 1;
    }
    if (run.status === "failed") {
      current.failedRuns += 1;
    }
    if (!current.lastRunAt || new Date(run.created_at) > new Date(current.lastRunAt)) {
      current.lastRunAt = run.created_at;
    }

    stacks.set(run.tech_stack, current);
  }

  return Array.from(stacks.values()).sort((first, second) => second.runs - first.runs);
}

function buildUserAnalytics(
  users: UserProfile[],
  runs: ScrapeRun[],
  jobs: JobResult[],
  clicks: AppliedJobClick[],
): UserAnalytics[] {
  const today = new Date().toISOString().slice(0, 10);

  return users
    .map((user) => {
      const userRuns = runs.filter((run) => run.user_id === user.id);
      const userJobs = jobs.filter((job) => job.user_id === user.id);
      const userClicks = clicks.filter((click) => click.user_id === user.id);
      const lastRun = userRuns
        .map((run) => run.created_at)
        .sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0];
      const lastClick = userClicks
        .map((click) => click.clicked_at)
        .sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0];

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at,
        runs: userRuns.length,
        jobs: userJobs.length,
        failedRuns: userRuns.filter((run) => run.status === "failed").length,
        completedRuns: userRuns.filter((run) => run.status === "completed").length,
        appliedToday: userClicks.filter((click) => click.applied_on === today).length,
        appliedTotal: userClicks.length,
        lastActivity: [lastRun, lastClick]
          .filter(Boolean)
          .sort((first, second) => new Date(second || "").getTime() - new Date(first || "").getTime())[0] || null,
      };
    })
    .sort((first, second) => {
      const firstActivity = first.lastActivity || first.created_at;
      const secondActivity = second.lastActivity || second.created_at;

      return new Date(secondActivity).getTime() - new Date(firstActivity).getTime();
    });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const filters = {
    user_id: params.user_id || "",
    tech_stack: params.tech_stack || "",
    date: params.date || "",
  };
  const supabase = await createClient();

  const [
    { data: usersData, error: usersError },
    { data: runsData, error: runsError },
    { data: jobsData, error: jobsError },
    { data: clicksData, error: clicksError },
  ] = await Promise.all([
    supabase.from("users_profile").select("*").order("created_at", { ascending: false }),
    supabase.from("scrape_runs").select("*, users_profile(email)").order("created_at", { ascending: false }),
    supabase.from("job_results").select("*").order("created_at", { ascending: false }),
    supabase.from("applied_job_clicks").select("*").order("clicked_at", { ascending: false }),
  ]);

  const users = (usersData || []) as UserProfile[];
  const runs = (runsData || []) as ScrapeRun[];
  const jobs = (jobsData || []) as JobResult[];
  const clicks = (clicksData || []) as AppliedJobClick[];
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const analytics = buildUserAnalytics(users, runs, jobs, clicks);
  const filteredRuns = filterRuns(runs, filters);
  const filteredJobs = filterJobs(jobs, filteredRuns);
  const filteredClicks = filterClicks(clicks, jobsById, filters);
  const filteredAppliedJobs = filteredClicks.map(
    (click): AppliedJobAnalytics => ({
      ...click,
      job: jobsById.get(click.job_id) || null,
    }),
  );
  const filteredUsers = filters.user_id
    ? analytics.filter((user) => user.id === filters.user_id)
    : analytics;
  const selectedUser = users.find((user) => user.id === filters.user_id) || null;
  const isSelectedWorker = selectedUser?.role === "worker";
  const isSelectedScraper = selectedUser?.role === "scraper";
  const workerTechAnalytics = buildWorkerTechAnalytics(filteredClicks, jobsById);
  const scraperTechAnalytics = buildScraperTechAnalytics(filteredRuns);
  const today = new Date().toISOString().slice(0, 10);
  const filteredClicksToday = filteredClicks.filter((click) => click.applied_on === today).length;
  const filteredLastClick = filteredClicks
    .map((click) => click.clicked_at)
    .sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0];
  const scrapedLinks = filteredRuns.reduce((total, run) => total + sourceUrlCount(run), 0);
  const error = usersError || runsError || jobsError || clicksError;
  const activeUsers = analytics.filter((user) => user.runs > 0 || user.appliedTotal > 0).length;
  const appliedToday = analytics.reduce((total, user) => total + user.appliedToday, 0);
  const failedRuns = runs.filter((run) => run.status === "failed").length;
  const filteredFailedRuns = filteredRuns.filter((run) => run.status === "failed").length;
  const filteredCompletedRuns = filteredRuns.filter((run) => run.status === "completed").length;
  const userOptions = [
    { label: "All users", value: "" },
    ...users.map((user) => ({
      label: user.full_name
        ? `${user.full_name}${user.email ? ` (${user.email})` : ""}`
        : user.email || user.id,
      value: user.id,
    })),
  ];
  const techStackOptions = [
    { label: "All tech stacks", value: "" },
    ...searchTechStackOptions,
  ];

  return (
    <section>
      <PageHeader
        title="Admin"
        description="Track worker applications, scraper runs, result volume, and pipeline health from one panel."
      />

      <div className="grid gap-4 md:grid-cols-6">
        <StatCard label="Total Users" value={users.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active Users" value={activeUsers} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Total Runs" value={runs.length} icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="Saved Jobs" value={jobs.length} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard label="Applied Today" value={appliedToday} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Failed Runs" value={failedRuns} icon={<CircleAlert className="h-5 w-5" />} />
      </div>

      {error ? (
        <div className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error.message}
        </div>
      ) : (
        <>
          <form className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_0.8fr_auto_auto] lg:items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">User</span>
                <Select name="user_id" options={userOptions} defaultValue={filters.user_id} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">Tech stack</span>
                <Select name="tech_stack" options={techStackOptions} defaultValue={filters.tech_stack} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">Day</span>
                <Input name="date" type="date" defaultValue={filters.date} />
              </label>
              <Button type="submit">
                <Search className="h-4 w-4" />
                Apply
              </Button>
              <Link
                href="/admin"
                className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink"
              >
                Reset
              </Link>
            </div>
          </form>

          {isSelectedWorker ? (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <StatCard
                label="Filtered Applies"
                value={filteredClicks.length}
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
              <StatCard
                label="Today"
                value={filteredClicksToday}
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
              <StatCard
                label="Tech Stacks"
                value={workerTechAnalytics.length}
                icon={<Briefcase className="h-5 w-5" />}
              />
              <StatCard
                label="Applied Jobs"
                value={filteredAppliedJobs.filter((click) => click.job).length}
                icon={<Link2 className="h-5 w-5" />}
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <StatCard label="Filtered Runs" value={filteredRuns.length} icon={<ListChecks className="h-5 w-5" />} />
              <StatCard label="Filtered Jobs" value={filteredJobs.length} icon={<Briefcase className="h-5 w-5" />} />
              <StatCard label="Scraped Links" value={scrapedLinks} icon={<Link2 className="h-5 w-5" />} />
              <StatCard label="Filtered Failed" value={filteredFailedRuns} icon={<CircleAlert className="h-5 w-5" />} />
            </div>
          )}

          {selectedUser ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">Selected user</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">
                    {selectedUser.full_name || selectedUser.email || "Unnamed user"}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-muted">{selectedUser.email || selectedUser.id}</p>
                </div>
                <StatusBadge status={selectedUser.role} />
              </div>
              {isSelectedWorker ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted">Applied total</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">{filteredClicks.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted">Applied today</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">{filteredClicksToday}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted">Tech stacks</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">{workerTechAnalytics.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted">Last applied</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{formatDate(filteredLastClick)}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted">Runs</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">{filteredRuns.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted">Jobs saved</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">{filteredJobs.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted">Scraped links</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">{scrapedLinks}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted">Completed</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">{filteredCompletedRuns}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-ink">User Analytics</h2>
            <DataTable
              data={filteredUsers}
              emptyMessage="No users found."
              columns={[
                {
                  key: "user",
                  header: "User",
                  cell: (user) => (
                    <div>
                      <p className="font-semibold">{user.full_name || "Unnamed user"}</p>
                      <p className="text-xs font-medium text-muted">{user.email || "No email"}</p>
                    </div>
                  ),
                },
                {
                  key: "role",
                  header: "Role",
                  cell: (user) => <StatusBadge status={user.role} />,
                },
                {
                  key: "primary_metric",
                  header: "Role Metric",
                  cell: (user) => {
                    if (user.role === "worker") {
                      return `${user.appliedTotal} applies`;
                    }
                    if (user.role === "scraper") {
                      return `${user.runs} runs`;
                    }
                    return `${user.runs} runs / ${user.appliedTotal} applies`;
                  },
                },
                {
                  key: "today",
                  header: "Today",
                  cell: (user) => (user.role === "worker" ? user.appliedToday : "-"),
                },
                {
                  key: "completed",
                  header: "Completed Runs",
                  cell: (user) => (user.role === "worker" ? "-" : user.completedRuns),
                },
                {
                  key: "failed",
                  header: "Failed Runs",
                  cell: (user) => (user.role === "worker" ? "-" : user.failedRuns),
                },
                {
                  key: "last_activity",
                  header: "Last Activity",
                  cell: (user) => formatDate(user.lastActivity),
                },
                {
                  key: "joined",
                  header: "Joined",
                  cell: (user) => formatDate(user.created_at),
                },
              ]}
            />
          </div>

          {isSelectedWorker ? (
            <>
              <div className="mt-8">
                <h2 className="mb-4 text-lg font-semibold text-ink">Worker Applies By Tech Stack</h2>
                <DataTable
                  data={workerTechAnalytics}
                  emptyMessage="No applications match this selection."
                  columns={[
                    { key: "tech_stack", header: "Tech Stack", cell: (row) => row.techStack },
                    { key: "applied_total", header: "Applied Total", cell: (row) => row.appliedTotal },
                    { key: "applied_today", header: "Applied Today", cell: (row) => row.appliedToday },
                    {
                      key: "last_applied",
                      header: "Last Applied",
                      cell: (row) => formatDate(row.lastAppliedAt),
                    },
                  ]}
                />
              </div>

              <div className="mt-8">
                <h2 className="mb-4 text-lg font-semibold text-ink">Applied Jobs For Selection</h2>
                <DataTable
                  data={filteredAppliedJobs}
                  emptyMessage="No applied jobs match this selection."
                  columns={[
                    {
                      key: "job_title",
                      header: "Job Title",
                      cell: (click) => click.job?.job_title || "Unavailable",
                    },
                    {
                      key: "company",
                      header: "Company",
                      cell: (click) => click.job?.company || "Unavailable",
                    },
                    {
                      key: "tech_stack",
                      header: "Tech Stack",
                      cell: (click) => click.job?.tech_stack || "Unavailable",
                    },
                    { key: "applied_on", header: "Applied On", cell: (click) => click.applied_on },
                    { key: "clicked_at", header: "Clicked", cell: (click) => formatDate(click.clicked_at) },
                    {
                      key: "job_link",
                      header: "Job Link",
                      cell: (click) =>
                        click.job ? (
                          <a
                            href={click.job.job_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary-dark hover:text-primary"
                          >
                            Open <Eye className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          "-"
                        ),
                    },
                  ]}
                />
              </div>
            </>
          ) : null}

          {isSelectedScraper ? (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-ink">Scraper Runs By Tech Stack</h2>
              <DataTable
                data={scraperTechAnalytics}
                emptyMessage="No scrape runs match this selection."
                columns={[
                  { key: "tech_stack", header: "Tech Stack", cell: (row) => row.techStack },
                  { key: "runs", header: "Runs", cell: (row) => row.runs },
                  { key: "completed", header: "Completed", cell: (row) => row.completedRuns },
                  { key: "failed", header: "Failed", cell: (row) => row.failedRuns },
                  { key: "scraped_links", header: "Scraped Links", cell: (row) => row.scrapedLinks },
                  { key: "saved_jobs", header: "Saved Jobs", cell: (row) => row.savedJobs },
                  { key: "last_run", header: "Last Run", cell: (row) => formatDate(row.lastRunAt) },
                ]}
              />
            </div>
          ) : null}

          {!isSelectedWorker ? (
            <div className="mt-8">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-lg font-semibold text-ink">Scrape Runs</h2>
              <p className="text-sm font-medium text-muted">
                {filteredCompletedRuns} completed, {filteredFailedRuns} failed
              </p>
            </div>
            <DataTable
              data={filteredRuns}
              emptyMessage="No scrape runs found."
              columns={[
                {
                  key: "email",
                  header: "User Email",
                  cell: (run) => run.users_profile?.email || "Unknown",
                },
                { key: "keyword", header: "Keyword", cell: (run) => run.keyword },
                { key: "tech_stack", header: "Tech Stack", cell: (run) => run.tech_stack },
                { key: "source_urls", header: "Scraped Links", cell: (run) => sourceUrlCount(run) },
                { key: "total_results", header: "Results", cell: (run) => run.total_results },
                {
                  key: "status",
                  header: "Status",
                  cell: (run) => <StatusBadge status={run.status} />,
                },
                { key: "created_at", header: "Created", cell: (run) => formatDate(run.created_at) },
                {
                  key: "view",
                  header: "Results",
                  cell: (run) => (
                    <Link
                      href={`/dashboard/results?run_id=${run.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-primary-dark hover:text-primary"
                    >
                      View <Eye className="h-3.5 w-3.5" />
                    </Link>
                  ),
                },
              ]}
            />
            </div>
          ) : null}

          {!selectedUser ? (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-ink">Saved Jobs For Selection</h2>
              <DataTable
                data={filteredJobs}
                emptyMessage="No saved jobs match this selection."
                columns={[
                  { key: "job_title", header: "Job Title", cell: (job) => job.job_title },
                  { key: "company", header: "Company", cell: (job) => job.company },
                  { key: "tech_stack", header: "Tech Stack", cell: (job) => job.tech_stack || "Unavailable" },
                  { key: "keyword", header: "Keyword", cell: (job) => job.keyword || "Unavailable" },
                  { key: "created_at", header: "Saved", cell: (job) => formatDate(job.created_at) },
                  {
                    key: "job_link",
                    header: "Job Link",
                    cell: (job) => (
                      <a
                        href={job.job_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary-dark hover:text-primary"
                      >
                        Open <Eye className="h-3.5 w-3.5" />
                      </a>
                    ),
                  },
                ]}
              />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
