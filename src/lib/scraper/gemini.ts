import type { ExtractedJobRow } from "./types";

const DEFAULT_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
];
const GEMINI_RETRY_BASE_DELAY_MS = 4000;
const MAX_GEMINI_QUOTA_WAIT_SECONDS = 90;

export class GeminiQuotaError extends Error {
  retryAfterSeconds: number | null;

  constructor(message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "GeminiQuotaError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function env(name: string, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function configuredModelCandidates() {
  const configuredModels = env("GEMINI_FALLBACK_MODELS");

  if (!configuredModels) {
    return DEFAULT_MODEL_CANDIDATES;
  }

  return configuredModels
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function orderedModels(modelName?: string) {
  return [modelName, ...configuredModelCandidates()].filter(
    (model, index, models): model is string =>
      Boolean(model?.trim()) && models.indexOf(model) === index,
  );
}

function isRetryableGeminiError(message: string) {
  const lowered = message.toLowerCase();
  return [
    "503",
    "unavailable",
    "high demand",
    "temporarily unavailable",
    "deadline exceeded",
    "timed out",
    "timeout",
    "internal",
    "connection reset",
    "service unavailable",
    "try again later",
  ].some((marker) => lowered.includes(marker));
}

function isQuotaGeminiError(message: string) {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("429") ||
    lowered.includes("resource_exhausted") ||
    lowered.includes("quota exceeded") ||
    lowered.includes("free_tier_requests")
  );
}

function retryAfterSecondsFromMessage(message: string) {
  const match = message.match(/retry in\s+([0-9.]+)s/i);
  return match ? Math.ceil(Number(match[1])) : null;
}

function extractResponseText(response: Record<string, unknown>) {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  const parts: string[] = [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const content = (candidate as Record<string, unknown>).content;
    const contentParts =
      content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).parts)
        ? ((content as Record<string, unknown>).parts as unknown[])
        : [];

    for (const part of contentParts) {
      if (part && typeof part === "object") {
        const text = (part as Record<string, unknown>).text;
        if (typeof text === "string") {
          parts.push(text);
        }
      }
    }
  }

  return parts.join("\n").trim();
}

function buildPrompt(markdownText: string, keyword: string) {
  const relatedTermsText = "- None provided";
  const maxContentChars = Number(env("GEMINI_MAX_CONTENT_CHARS", "60000"));
  const content = markdownText.slice(0, maxContentChars);

  return `
Extract only the latest valid REMOTE technical/development-side job listings from the content below that are genuinely related to the keyword "${keyword}".

Return ONLY markdown table rows.
Do NOT return JSON.
Do NOT return explanations.
Do NOT return summaries.
Do NOT return a header row.

Columns exactly in this order:
| Job Title | Company | Job Link | Clearance | Posted Time |

CORE MATCHING LOGIC (STRICT IF / ELSE FLOW)

FOR EACH JOB:

STEP 1 — TITLE MATCHING (PRIMARY MATCH LOGIC)

* First analyze ONLY the Job Title.
* Check if the Job Title contains:

  * "${keyword}"
  * OR any related keyword from:
    ${relatedTermsText}

IF the title matches:

* Treat the job as keyword-relevant.
* DO NOT perform additional keyword matching against the description.
* Immediately continue to:

  * Clearance validation
  * Pay-rate validation
  * Remote validation
  * Time validation

ELSE:

* Move to STEP 2.

STEP 2 — DESCRIPTION MATCHING (ONLY IF TITLE FAILED)

* Analyze the full job description/content ONLY if the title did NOT match.
* Continue ONLY if the description strongly matches:

  * "${keyword}"
  * OR technologies/platforms/tools/ecosystem from:
    ${relatedTermsText}

Reject jobs where:

* The keyword is only casually mentioned
* The stack is not central to the role
* The technology is secondary or optional

IF description does NOT strongly match:

* Reject the job immediately.

IF description strongly matches:

* Continue to:

  * Clearance validation
  * Pay-rate validation
  * Remote validation
  * Time validation

STEP 3 — TECHNICAL ROLE FILTER
Accept ONLY hands-on technical roles.

Allowed title patterns include:

* Developer
* Engineer
* Architect
* Administrator
* QA
* Tester
* DevOps
* Integration
* Technical
* Programmer
* Consultant
* Software

Reject titles containing:

* Manager
* Director
* VP
* Head
* Sales
* Account
* Customer
* Growth
* Revenue
* Marketing
* Operations
* Success
* Recruiter
* HR
* Talent
* Product Owner
* Scrum Master

STEP 4 — REMOTE FILTER

* Accept ONLY fully REMOTE jobs.
* Reject:

  * Hybrid
  * Onsite
  * Local-only remote
  * Travel-heavy jobs

STEP 5 — SECURITY CLEARANCE FILTER (MANDATORY)
Analyze the FULL JD carefully.

Reject the job immediately if ANY clearance requirement exists, including:

* Security Clearance
* Secret Clearance
* Top Secret
* TS/SCI
* Public Trust
* Clearance Required
* Active Clearance
* Eligible for Clearance
* Ability to Obtain Clearance
* Government Clearance
* Federal Clearance
* DoD Clearance
* DHS Clearance
* SCI
* Polygraph
* Clearance Preferred
* Clearance Mandatory

IF any security/government/public-trust requirement is mentioned:

* Reject the job immediately.

For accepted jobs:

* Clearance column must always contain:
  "No Clearance"

STEP 6 — PAY RATE FILTER (MANDATORY)

FULL-TIME / W2 RULES:
Accept ONLY if:

* Salary >= $120,000/year
  OR
* Hourly >= $60/hour

Reject if:

* Salary < $120k
* Hourly < $60/hr

CONTRACT / C2C / 1099 RULES:
Accept ONLY if:

* Hourly >= $50/hour

Reject if:

* Contract/C2C/1099 rate < $50/hr

If compensation is missing:

* Prefer rejecting unless the role is extremely strong and highly relevant.

STEP 7 — POSTED TIME FILTER
Accept ONLY jobs posted within the last 24 hours.

Reject:

* 2+ days ago
* last week
* last month
* stale listings

If posted time is unavailable but the job is highly relevant:

* Use:
  "Unknown"

STEP 8 — LINK VALIDATION
Accept ONLY valid direct job URLs:

* Must start with:

  * http://
  * https://

Reject:

* Broken links
* Empty links
* Redirect placeholders
* Non-http links

STEP 9 — DEDUPLICATION
Reject duplicate:

* Links
* Company/title combinations
* Reposted identical jobs

FINAL OUTPUT RULES

* Return ONLY markdown table rows.
* Exactly 5 columns.
* No markdown table header.
* No explanations.
* No intro text.
* No summaries.

If no valid jobs exist:
Return exactly:
EMPTY

Related terms:
${relatedTermsText}

CONTENT START
${content}
CONTENT END

`.trim();
}

export async function extractJobsWithGemini(markdownText: string, keyword: string) {
  const apiKey = env("GEMINI_API_KEY");

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  if (!markdownText.trim()) {
    return "";
  }

  const prompt = buildPrompt(markdownText, keyword);
  const retryAttempts = Number(env("GEMINI_RETRY_ATTEMPTS", "1"));
  const quotaRetryAttempts = Number(env("GEMINI_QUOTA_RETRY_ATTEMPTS", "3"));
  let lastError: unknown;

  for (const model of orderedModels(env("GEMINI_MODEL", "gemini-2.5-flash"))) {
    for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
      let quotaAttemptsUsed = 0;

      try {
        while (true) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              signal: AbortSignal.timeout(Number(env("GEMINI_REQUEST_TIMEOUT_MS", "25000"))),
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
              }),
            },
          );

          const bodyText = await response.text();

          if (!response.ok) {
            const message = `Gemini ${model} returned ${response.status}: ${bodyText.slice(0, 500)}`;

            if (isQuotaGeminiError(message)) {
              const retryAfterSeconds = retryAfterSecondsFromMessage(message);
              const waitSeconds = retryAfterSeconds
                ? Math.min(retryAfterSeconds, MAX_GEMINI_QUOTA_WAIT_SECONDS)
                : Number(env("GEMINI_DEFAULT_QUOTA_WAIT_SECONDS", "60"));

              if (quotaAttemptsUsed < quotaRetryAttempts) {
                quotaAttemptsUsed += 1;
                console.info(
                  `Gemini quota hit on ${model}; waiting ${waitSeconds}s before retry ${quotaAttemptsUsed}/${quotaRetryAttempts}.`,
                );
                await sleep(waitSeconds * 1000);
                continue;
              }

              throw new GeminiQuotaError(
                "Gemini quota was exhausted for the active API key/project.",
                retryAfterSeconds,
              );
            }

            throw new Error(message);
          }

          const body = JSON.parse(bodyText) as Record<string, unknown>;
          return extractResponseText(body);
        }
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);

        if (error instanceof GeminiQuotaError) {
          throw error;
        }

        const shouldRetry = isRetryableGeminiError(message);

        if (shouldRetry && attempt < retryAttempts) {
          await sleep(GEMINI_RETRY_BASE_DELAY_MS * attempt);
          continue;
        }

        console.info(
          `Gemini fallback: ${model} failed for this source; trying next model if available. ${message.slice(0, 180)}`,
        );
        break;
      }
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${String(lastError)}`);
}

export function parseMarkdownRows(rowsMarkdown: string): ExtractedJobRow[] {
  if (!rowsMarkdown.trim()) {
    return [];
  }

  const rows: ExtractedJobRow[] = [];

  for (const line of rowsMarkdown.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith("|")) {
      continue;
    }

    const normalized = trimmedLine.replace(/\s/g, "").toLowerCase();
    if (
      [
        "|jobtitle|company|joblink|clearance|postedtime|",
        "|---|---|---|---|---|",
        "|:---|:---|:---|:---|:---|",
      ].includes(normalized)
    ) {
      continue;
    }

    const parts = trimmedLine
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length !== 5) {
      continue;
    }

    const markdownLink = parts[2].match(/\((https?:\/\/[^)]+)\)/);
    const plainLink = parts[2].match(/https?:\/\/[^\s|]+/);
    const jobLink = (markdownLink?.[1] || plainLink?.[0] || parts[2]).trim().replace(/\)+$/, "");

    if (!parts[0] || !jobLink.startsWith("http")) {
      continue;
    }

    rows.push({
      job_title: parts[0],
      company: parts[1] || "Unknown",
      job_link: jobLink,
      clearance: parts[3] || "No Clearance",
      posted_time: parts[4] || "Unknown",
    });
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.job_link)) {
      return false;
    }
    seen.add(row.job_link);
    return true;
  });
}
