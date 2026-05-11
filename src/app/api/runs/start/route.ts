import { NextResponse } from "next/server";
import { after } from "next/server";
import { processScrapeRun } from "@/lib/scraper/pipeline";
import type { StartRunPayload } from "@/lib/scraper/types";

export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.SCRAPER_BACKEND_SECRET;

  if (expectedSecret && request.headers.get("x-pipeline-secret") !== expectedSecret) {
    return NextResponse.json({ detail: "Unauthorized pipeline request." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<StartRunPayload> & {
    run_id?: string;
    urls?: string[];
  };

  const run: StartRunPayload = {
    id: String(body.id || body.run_id || ""),
    user_id: String(body.user_id || ""),
    tech_stack: String(body.tech_stack || ""),
    keyword: String(body.keyword || ""),
    source_urls: Array.isArray(body.source_urls) ? body.source_urls : body.urls || [],
  };

  if (!run.id || !run.user_id || !run.tech_stack || !run.keyword || run.source_urls.length === 0) {
    return NextResponse.json({ detail: "Invalid scrape run payload." }, { status: 400 });
  }

  after(() =>
    processScrapeRun(run).catch((error) => {
      console.error("Scrape run failed after API start:", error);
    }),
  );

  return NextResponse.json({ ok: true, run_id: run.id });
}
