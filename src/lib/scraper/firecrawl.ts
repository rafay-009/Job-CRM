import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FirecrawlPage } from "./types";

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev";

function env(name: string, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrlKey(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
    return parsed.toString();
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function isScrapeableUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanScrapeUrls(urls: string[]) {
  const seen = new Set<string>();
  const cleanUrls: string[] = [];

  for (const rawUrl of urls) {
    const candidate = rawUrl.trim();
    if (!candidate || !isScrapeableUrl(candidate)) {
      continue;
    }

    const key = normalizeUrlKey(candidate);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    cleanUrls.push(candidate);
  }

  return cleanUrls;
}

function isRetryableStatus(status: number) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
}

async function firecrawlFetch(path: string, init?: RequestInit) {
  const apiKey = env("FIRECRAWL_API_KEY");
  const timeoutMs = Number(env("FIRECRAWL_REQUEST_TIMEOUT_MS", "30000"));

  if (!apiKey) {
    throw new Error("Missing FIRECRAWL_API_KEY.");
  }

  if (!apiKey.startsWith("fc-")) {
    throw new Error("FIRECRAWL_API_KEY should start with 'fc-'.");
  }

  return fetch(`${FIRECRAWL_BASE_URL}${path}`, {
    ...init,
    signal: init?.signal || AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

async function requestWithRetries(path: string, init?: RequestInit) {
  const retries = Number(env("FIRECRAWL_STATUS_RETRIES", "1"));
  const delayMs = Number(env("FIRECRAWL_STATUS_RETRY_DELAY_MS", "3000"));
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const response = await firecrawlFetch(path, init);

      if (!isRetryableStatus(response.status) || attempt > retries) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt > retries) {
        break;
      }
    }

    await sleep(delayMs);
  }

  throw new Error(`Firecrawl request failed after retries: ${String(lastError)}`);
}

function pagesFromData(data: unknown, requestUrls: string[]) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item, index): FirecrawlPage => {
    const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const metadata =
      raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : {};
    const sourceUrl =
      String(metadata.sourceURL || metadata.url || raw.url || requestUrls[index] || "").trim();

    return {
      sourceUrl,
      markdown: String(raw.markdown || "").trim(),
      raw,
    };
  });
}

function pageKey(page: FirecrawlPage) {
  const metadata =
    page.raw.metadata && typeof page.raw.metadata === "object"
      ? (page.raw.metadata as Record<string, unknown>)
      : {};

  return normalizeUrlKey(
    String(page.sourceUrl || metadata.sourceURL || metadata.url || page.raw.url || "").trim(),
  );
}

function failedPage(url: string, error: unknown): FirecrawlPage {
  return {
    sourceUrl: url,
    markdown: "",
    raw: {
      url,
      retry_status: "firecrawl_failed",
      error: error instanceof Error ? error.message : String(error),
    },
  };
}

function safeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "source";
}

async function saveMarkdownFile(runId: string, index: number, sourceUrl: string, markdown: string) {
  const runDir = markdownRunDir(runId);
  const filename = `${String(index + 1).padStart(2, "0")}-${safeFilenamePart(sourceUrl)}.md`;
  const filePath = path.join(runDir, filename);

  await mkdir(runDir, { recursive: true });
  await writeFile(
    filePath,
    `# Source ${index + 1}\n\n${sourceUrl}\n\n---\n\n${markdown || ""}\n`,
    "utf8",
  );

  return filePath;
}

function markdownRunDir(runId: string) {
  const baseDir = process.env.VERCEL ? os.tmpdir() : process.cwd();
  return path.join(baseDir, "scrape-output", runId);
}

export async function cleanupMarkdownFiles(runId: string) {
  try {
    await rm(markdownRunDir(runId), { recursive: true, force: true });
    console.info(`Cleaned up markdown files for scrape run ${runId}.`);
  } catch (error) {
    console.warn(
      `Could not clean up markdown files for scrape run ${runId}.`,
      error instanceof Error ? error.message : error,
    );
  }
}

function pageFromScrapeData(data: unknown, fallbackUrl: string): FirecrawlPage {
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const metadata =
    raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : {};
  const sourceUrl = String(metadata.sourceURL || metadata.url || raw.url || fallbackUrl).trim();

  return {
    sourceUrl,
    markdown: String(raw.markdown || "").trim(),
    raw,
  };
}

async function scrapeSingleUrl(url: string) {
  const response = await requestWithRetries("/v2/scrape", {
    method: "POST",
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      blockAds: true,
      proxy: env("FIRECRAWL_PROXY", "auto"),
      storeInCache: true,
      removeBase64Images: true,
      timeout: Number(env("FIRECRAWL_SCRAPE_TIMEOUT_MS", "30000")),
      location: {
        country: "US",
        languages: ["en-US"],
      },
    }),
  });

  if (response.status === 401) {
    throw new Error("Firecrawl 401 Unauthorized. Check FIRECRAWL_API_KEY.");
  }

  if (!response.ok) {
    throw new Error(`Firecrawl scrape failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as Record<string, unknown>;
  const data = body.data || body;
  const page = pageFromScrapeData(data, url);

  if (!page.markdown) {
    throw new Error("Firecrawl returned empty markdown.");
  }

  return page;
}

async function postBatchScrape(urls: string[], maxConcurrency: number) {
  const response = await requestWithRetries("/v2/batch/scrape", {
    method: "POST",
    body: JSON.stringify({
      urls,
      formats: ["markdown"],
      onlyMainContent: true,
      maxConcurrency,
      blockAds: true,
      proxy: "auto",
      storeInCache: true,
      removeBase64Images: true,
    }),
  });

  if (response.status === 401) {
    throw new Error("Firecrawl 401 Unauthorized. Check FIRECRAWL_API_KEY.");
  }

  if (!response.ok) {
    throw new Error(`Firecrawl batch scrape failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

async function getBatchStatus(jobId: string) {
  let response = await requestWithRetries(`/v2/batch/scrape/${jobId}`);

  if (response.status === 404) {
    response = await requestWithRetries(`/v1/batch/scrape/${jobId}`);
  }

  if (response.status === 401) {
    throw new Error("Firecrawl 401 Unauthorized while polling status.");
  }

  if (!response.ok) {
    throw new Error(`Firecrawl status check failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

async function runBatchScrapeOnce(urls: string[], maxConcurrency: number) {
  const initial = await postBatchScrape(urls, maxConcurrency);
  const jobId = String(initial.id || initial.jobId || "");

  if (!jobId) {
    throw new Error(`Firecrawl batch scrape did not return an id.`);
  }

  const expected = urls.length;
  const collected = new Map<string, FirecrawlPage>();
  const startedAt = Date.now();
  const pollIntervalMs = Number(env("FIRECRAWL_POLL_INTERVAL_MS", "2000"));
  const maxWaitMs = Number(env("FIRECRAWL_MAX_WAIT_MS", "25000"));
  let timedOut = true;

  while (Date.now() - startedAt <= maxWaitMs) {
    const status = await getBatchStatus(jobId);
    const pages = pagesFromData(status.data, urls);

    for (const page of pages) {
      const key = pageKey(page);
      const previous = collected.get(key);

      if (!previous || page.markdown.length > previous.markdown.length) {
        collected.set(key, page);
      }
    }

    const statusText = String(status.status || "").toLowerCase();
    if (
      ["completed", "complete", "done", "finished"].includes(statusText) ||
      collected.size >= expected
    ) {
      timedOut = false;
      break;
    }

    await sleep(pollIntervalMs);
  }

  if (timedOut) {
    console.info(`Firecrawl timed out after ${maxWaitMs}ms for ${urls[0] || `${urls.length} URL(s)`}.`);
  }

  return Array.from(collected.values());
}

export async function batchScrapeMarkdown(urls: string[]) {
  const orderedUrls = cleanScrapeUrls(urls);

  if (orderedUrls.length === 0) {
    return [];
  }

  const bestPages = new Map<string, FirecrawlPage>();
  const maxConcurrency = Number(env("FIRECRAWL_MAX_CONCURRENCY", "5"));
  const scrapeRetryCount = Number(env("FIRECRAWL_SCRAPE_RETRIES", "0"));

  for (let attempt = 0; attempt <= scrapeRetryCount; attempt += 1) {
    const retryUrls = orderedUrls.filter((url) => {
      const page = bestPages.get(normalizeUrlKey(url));
      return !page?.markdown && page?.raw.retry_status !== "firecrawl_failed";
    });

    if (retryUrls.length === 0) {
      break;
    }

    if (attempt > 0) {
      await sleep(Number(env("FIRECRAWL_SCRAPE_RETRY_DELAY_MS", "5000")));
    }

    let pages: FirecrawlPage[];

    try {
      pages = await runBatchScrapeOnce(retryUrls, maxConcurrency);
    } catch (error) {
      console.warn(
        `Firecrawl batch failed for ${retryUrls.length} URL(s); retrying sources one at a time.`,
        error instanceof Error ? error.message : error,
      );

      pages = [];

      for (const url of retryUrls) {
        try {
          pages.push(...(await runBatchScrapeOnce([url], 1)));
        } catch (singleUrlError) {
          console.warn(
            `Fetch failed for the following link: ${url}`,
            singleUrlError instanceof Error ? singleUrlError.message : singleUrlError,
          );
          pages.push(failedPage(url, singleUrlError));
        }
      }
    }

    for (const page of pages) {
      const key = pageKey(page);
      const previous = bestPages.get(key);

      if (!previous || page.markdown.length > previous.markdown.length) {
        bestPages.set(key, page);
      }
    }
  }

  return orderedUrls.map(
    (url) =>
      bestPages.get(normalizeUrlKey(url)) || {
        sourceUrl: url,
        markdown: "",
        raw: { url, retry_status: "missing_or_empty" },
      },
  );
}

export async function scrapeMarkdownUrl(url: string, runId?: string, index = 0) {
  const [orderedUrl] = cleanScrapeUrls([url]);

  if (!orderedUrl) {
    return failedPage(url, new Error("Invalid source URL."));
  }

  try {
    let page: FirecrawlPage;

    try {
      page = await scrapeSingleUrl(orderedUrl);
    } catch (singleScrapeError) {
      console.warn(
        `Firecrawl single scrape failed; trying batch fallback for ${orderedUrl}`,
        singleScrapeError instanceof Error ? singleScrapeError.message : singleScrapeError,
      );

      const [fallbackPage] = await runBatchScrapeOnce([orderedUrl], 1);
      page =
        fallbackPage ||
        failedPage(
          orderedUrl,
          new Error(`Firecrawl returned no markdown before timeout for ${orderedUrl}.`),
        );
    }

    if (runId && page.markdown) {
      try {
        page.markdownPath = await saveMarkdownFile(runId, index, page.sourceUrl, page.markdown);
        console.info(`Saved Firecrawl markdown for source ${index + 1}: ${page.markdownPath}`);
      } catch (saveError) {
        console.warn(
          `Could not save markdown file for source ${index + 1}; continuing with in-memory markdown.`,
          saveError instanceof Error ? saveError.message : saveError,
        );
      }
    }

    return page;
  } catch (error) {
    console.warn(
      `Fetch failed for the following link: ${orderedUrl}`,
      error instanceof Error ? error.message : error,
    );
    return failedPage(orderedUrl, error);
  }
}
