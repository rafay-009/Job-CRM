import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanupMarkdownFiles, scrapeMarkdownUrl } from "./firecrawl";
import { GeminiQuotaError, extractJobsWithGemini, parseMarkdownRows } from "./gemini";
import type { ExtractedJobRow, FirecrawlPage, StartRunPayload } from "./types";

type RunUpdate = {
  status?: string;
  current_step?: string;
  status_message?: string;
  progress?: number;
  total_results?: number;
  error_message?: string | null;
};

function isSchemaCacheError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("schema cache") || message.toLowerCase().includes("column");
}

function getPipelineClient(run?: StartRunPayload) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminClient();
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !getSupabasePublicKey() || !run?.user_access_token) {
    throw new Error(
      "Missing Supabase backend credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or start the scraper from an authenticated dashboard session.",
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, getSupabasePublicKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${run.user_access_token}`,
      },
    },
  });
}

async function updateRun(run: StartRunPayload, values: RunUpdate) {
  const supabase = getPipelineClient(run);
  const updateValues = {
    ...values,
    status_updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("scrape_runs").update(updateValues).eq("id", run.id);

  if (!error) {
    return;
  }

  if (!isSchemaCacheError(error)) {
    throw error;
  }

  const legacyValues = Object.fromEntries(
    Object.entries(values).filter(([key]) => ["status", "total_results", "error_message"].includes(key)),
  );

  if (Object.keys(legacyValues).length > 0) {
    const { error: legacyError } = await supabase
      .from("scrape_runs")
      .update(legacyValues)
      .eq("id", run.id);

    if (legacyError) {
      throw legacyError;
    }
  }
}

async function safeUpdateRun(run: StartRunPayload, values: RunUpdate) {
  try {
    await updateRun(run, values);
  } catch (error) {
    console.warn(
      `Could not update scrape run ${run.id}; continuing scraper pipeline.`,
      error instanceof Error ? error.message : error,
    );
  }
}

async function countResults(run: StartRunPayload) {
  const supabase = getPipelineClient(run);
  const { count, error } = await supabase
    .from("job_results")
    .select("id", { count: "exact", head: true })
    .eq("run_id", run.id);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function safeCountResults(run: StartRunPayload, fallback: number) {
  try {
    return await countResults(run);
  } catch (error) {
    console.warn(
      `Could not count results for scrape run ${run.id}; using saved count fallback.`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

async function saveJobs(
  run: StartRunPayload,
  sourceUrl: string,
  rows: ExtractedJobRow[],
  seenLinks: Set<string>,
) {
  const jobs = rows
    .filter((row) => {
      if (!row.job_link || seenLinks.has(row.job_link)) {
        return false;
      }
      seenLinks.add(row.job_link);
      return true;
    })
    .map((row) => ({
      run_id: run.id,
      user_id: run.user_id,
      job_title: row.job_title.trim().slice(0, 500),
      company: (row.company || "Unknown").trim().slice(0, 300),
      job_link: row.job_link.trim(),
      source_url: sourceUrl,
      posted_time: (row.posted_time || "Unknown").trim().slice(0, 100),
      tech_stack: run.tech_stack,
      keyword: run.keyword,
      location: null,
      is_remote: true,
    }));

  if (jobs.length === 0) {
    return 0;
  }

  const supabase = getPipelineClient(run);
  const { error } = await supabase.from("job_results").insert(jobs);

  if (error) {
    throw error;
  }

  return jobs.length;
}

async function processPage(run: StartRunPayload, page: FirecrawlPage, seenLinks: Set<string>) {
  if (!page.markdown.trim()) {
    throw new Error("Firecrawl returned empty markdown.");
  }

  const timeoutMs = Number(process.env.GEMINI_PAGE_TIMEOUT_MS || "240000");
  const extractedRowsMarkdown = await Promise.race([
    extractJobsWithGemini(page.markdown, run.keyword),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini extraction timed out after ${timeoutMs}ms.`)), timeoutMs),
    ),
  ]);
  const rows = parseMarkdownRows(extractedRowsMarkdown);
  return saveJobs(run, page.sourceUrl, rows, seenLinks);
}

export async function processScrapeRun(run: StartRunPayload) {
  const failures: string[] = [];
  const seenLinks = new Set<string>();
  let quotaStopped = false;

  try {
    console.info(`Scrape run ${run.id} started with ${run.source_urls.length} source link(s).`);

    await safeUpdateRun(run, {
      status: "running",
      current_step: "Starting Firecrawl",
      status_message: `Processing ${run.source_urls.length} source link(s).`,
      progress: 5,
      error_message: null,
    });

    let savedTotal = 0;

    for (let index = 0; index < run.source_urls.length; index += 1) {
      const sourceUrl = run.source_urls[index];
      const progressBase = 5 + Math.floor((index / Math.max(run.source_urls.length, 1)) * 90);

      try {
        await safeUpdateRun(run, {
          status: "running",
          current_step: `Scraping source ${index + 1} of ${run.source_urls.length}`,
          status_message: "Scraping the current source.",
          progress: Math.min(progressBase, 95),
          error_message: null,
        });

        const page = await scrapeMarkdownUrl(sourceUrl, run.id, index);

        await safeUpdateRun(run, {
          status: "running",
          current_step: `Sorting source ${index + 1} of ${run.source_urls.length}`,
          status_message: page.markdownPath
            ? "Markdown saved. Extracting jobs from the current source."
            : "Extracting jobs from the current source.",
          progress: Math.min(progressBase + 2, 95),
        });

        const savedForSource = await processPage(run, page, seenLinks);
        savedTotal += savedForSource;
        console.info(`Scrape run ${run.id} source ${index + 1} saved ${savedForSource} job(s).`);

        await safeUpdateRun(run, {
          status: "running",
          current_step: `Finished source ${index + 1} of ${run.source_urls.length}`,
          status_message:
            savedForSource > 0
              ? `Saved ${savedForSource} job(s). Moving to the next link.`
              : "No valid jobs found. Moving to the next link.",
          progress: Math.min(progressBase + 4, 95),
          total_results: savedTotal,
          error_message: null,
        });
      } catch (error) {
        if (error instanceof GeminiQuotaError) {
          failures.push("Gemini quota stopped the remaining sources.");
          quotaStopped = true;
          console.warn(
            `Gemini quota exhausted for scrape run ${run.id}.`,
            error.retryAfterSeconds ? `Retry after ${error.retryAfterSeconds}s.` : "",
          );

          await safeUpdateRun(run, {
            status: "running",
            current_step: "Paused by Gemini quota",
            status_message: error.retryAfterSeconds
              ? `Gemini quota is temporarily exhausted. Try a new run in about ${error.retryAfterSeconds} seconds.`
              : "Gemini quota is temporarily exhausted. Try a new run later.",
            progress: Math.min(progressBase + 4, 95),
            total_results: savedTotal,
            error_message: null,
          });

          break;
        }

        failures.push(`Fetch failed for the following link: ${sourceUrl}`);
        console.warn(
          `Fetch failed for the following link: ${sourceUrl}`,
          error instanceof Error ? error.message : error,
        );

        await safeUpdateRun(run, {
          status: "running",
          current_step: `Skipped source ${index + 1} of ${run.source_urls.length}`,
          status_message: "A source could not be processed. Moving to the next link.",
          progress: Math.min(progressBase + 4, 95),
          total_results: savedTotal,
          error_message: null,
        });
      }
    }

    const totalResults = await safeCountResults(run, savedTotal);

    if (quotaStopped) {
      await updateRun(run, {
        status: totalResults > 0 ? "completed" : "failed",
        current_step: totalResults > 0 ? "Completed with quota warning" : "Stopped by Gemini quota",
        status_message:
          totalResults > 0
            ? `Saved ${totalResults} job(s). Gemini quota stopped the remaining sources.`
            : "Gemini quota stopped the scraper before any jobs were saved.",
        progress: 100,
        total_results: totalResults,
        error_message: null,
      });
      return;
    }

    if (totalResults === 0 && failures.length > 0) {
      await updateRun(run, {
        status: "failed",
        current_step: "Failed",
        status_message: "The Next.js backend could not save any job results.",
        progress: 100,
        total_results: 0,
        error_message: "No jobs were saved. All sources failed or returned no valid jobs.",
      });
      return;
    }

    await updateRun(run, {
      status: "completed",
      current_step: failures.length > 0 ? "Completed with warnings" : "Completed",
      status_message:
        failures.length > 0
          ? `Saved ${totalResults} job(s). ${failures.length} source URL(s) failed.`
          : `Saved ${totalResults} job(s) with the Next.js backend.`,
      progress: 100,
      total_results: totalResults,
      error_message: null,
    });

    console.info(`Run ${run.id} completed. Saved this worker pass: ${savedTotal}`);
  } catch (error) {
    console.error(error);
    try {
      await updateRun(run, {
        status: "failed",
        current_step: "Failed",
        status_message: "The Next.js backend stopped before completing.",
        progress: 100,
        error_message: error instanceof Error ? error.message : String(error),
      });
    } catch (updateError) {
      console.error("Could not mark scrape run as failed:", updateError);
    }
  } finally {
    await cleanupMarkdownFiles(run.id);
  }
}
