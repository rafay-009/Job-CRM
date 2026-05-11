import { ExternalLink } from "lucide-react";
import { CsvExportButton } from "@/components/csv-export-button";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui/data-table";
import { createClient } from "@/lib/supabase/server";
import { requireScraper } from "@/lib/auth";
import type { JobResult, ScrapeRun } from "@/lib/types";
import { ResultsRefresh } from "./results-refresh";

function shortUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

function isRunStalled(run: ScrapeRun | null) {
  if (!run || (run.status !== "pending" && run.status !== "running")) return false;

  const startedAt = new Date(run.created_at).getTime();
  const fifteenMinutes = 15 * 60 * 1000;

  return Date.now() - startedAt > fifteenMinutes;
}

function runProgress(run: ScrapeRun | null) {
  if (!run) return 0;
  if (run.status === "completed") return 100;

  return Math.min(100, Math.max(0, run.progress || 0));
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ run_id?: string }>;
}) {
  const profile = await requireScraper();
  const { run_id: runId } = await searchParams;
  const supabase = await createClient();

  let run: ScrapeRun | null = null;
  let runError: { message: string } | null = null;

  if (runId) {
    let runQuery = supabase
      .from("scrape_runs")
      .select("*")
      .eq("id", runId);

    if (profile.role !== "admin") {
      runQuery = runQuery.eq("user_id", profile.id);
    }

    const { data, error } = await runQuery.maybeSingle();

    run = data as ScrapeRun | null;
    runError = error;
  }

  let resultsQuery = runId
    ? supabase.from("job_results").select("*").eq("run_id", runId).order("created_at", { ascending: false })
    : null;

  if (resultsQuery && profile.role !== "admin") {
    resultsQuery = resultsQuery.eq("user_id", profile.id);
  }

  const { data, error } = resultsQuery ? await resultsQuery : { data: [], error: null };

  const results = (data || []) as JobResult[];
  const isScraping = run?.status === "pending" || run?.status === "running";
  const stalled = isRunStalled(run);
  const progress = runProgress(run);
  const statusError = error || runError;

  return (
    <section>
      <ResultsRefresh active={Boolean(runId && isScraping)} />
      <PageHeader
        title="Results"
        description={
          runId
            ? "Showing jobs collected for the selected scrape run."
            : "Submit a search or open a run from History to view only that scrape's results."
        }
        action={<CsvExportButton results={results} />}
      />

      {statusError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {statusError.message}
        </div>
      ) : !runId ? (
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-sm font-medium text-muted shadow-sm">
          Run a new search to see the current scrape here, or open a specific run from History.
        </div>
      ) : (
        <>
          {run ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {run.current_step || (isScraping ? "Starting scraper" : run.status)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted">
                    {run.status_message ||
                      (isScraping
                        ? "Waiting for the next backend pipeline update."
                        : "No status message was saved for this run.")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-muted">{progress}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {run.status_updated_at ? (
                <p className="mt-2 text-xs font-medium text-muted">
                  Last update: {new Date(run.status_updated_at).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : null}
          {isScraping ? (
            <div
              className={
                stalled
                  ? "mb-4 rounded-lg border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-medium text-orange-800"
                  : "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800"
              }
            >
              {stalled
                ? "This scrape has been running for more than 15 minutes without finishing. The backend pipeline may have stopped before updating the run status."
                : "Scraping is still running. This page refreshes automatically while the backend stores the current run's jobs."}
            </div>
          ) : null}
          {run?.error_message ? (
            <div
              className={
                run.status === "failed"
                  ? "mb-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
                  : "mb-4 whitespace-pre-line rounded-lg border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-medium text-orange-800"
              }
            >
              {run.error_message}
            </div>
          ) : null}
          <DataTable
            data={results}
            emptyMessage={
              isScraping
                ? "Scraping in progress. Results will appear here as soon as the backend saves them."
                : "No job results were saved for this scrape run."
            }
            columns={[
              {
                key: "job_title",
                header: "Job Title",
                cell: (job) => (
                  <a
                    href={job.job_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-80 items-center gap-1 font-semibold text-primary-dark hover:text-primary"
                  >
                    <span className="truncate">{job.job_title}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ),
              },
              { key: "company", header: "Company", cell: (job) => job.company },
              {
                key: "job_link",
                header: "Job Link",
                cell: (job) => (
                  <a
                    href={job.job_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-72 items-center gap-1 text-primary-dark hover:text-primary"
                  >
                    <span className="truncate">{shortUrl(job.job_link)}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ),
              },
              { key: "posted_time", header: "Posted Time", cell: (job) => job.posted_time },
              { key: "keyword", header: "Keyword", cell: (job) => job.keyword },
              {
                key: "source_url",
                header: "Source",
                cell: (job) => (
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-72 items-center gap-1 text-primary-dark hover:text-primary"
                  >
                    <span className="truncate">{shortUrl(job.source_url)}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ),
              },
            ]}
          />
        </>
      )}
    </section>
  );
}
