import Link from "next/link";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { requireScraper } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { ScrapeRun } from "@/lib/types";

function displayStatus(run: ScrapeRun) {
  if (run.status !== "pending" && run.status !== "running") return run.status;

  const startedAt = new Date(run.created_at).getTime();
  const fifteenMinutes = 15 * 60 * 1000;

  return Date.now() - startedAt > fifteenMinutes ? "stalled" : run.status;
}

export default async function HistoryPage() {
  const profile = await requireScraper();
  const supabase = await createClient();
  let query = supabase
    .from("scrape_runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (profile.role !== "admin") {
    query = query.eq("user_id", profile.id);
  }

  const { data, error } = await query;

  const runs = (data || []) as ScrapeRun[];

  return (
    <section>
      <PageHeader
        title="History"
        description="Review previous scrape requests, backend status, and result counts."
      />
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error.message}
        </div>
      ) : (
        <DataTable
          data={runs}
          emptyMessage="No scrape history yet."
          columns={[
            { key: "keyword", header: "Keyword", cell: (run) => run.keyword },
            { key: "tech_stack", header: "Tech Stack", cell: (run) => run.tech_stack },
            { key: "total_results", header: "Total Results", cell: (run) => run.total_results },
            {
              key: "current_step",
              header: "Current Step",
              cell: (run) => run.current_step || "Waiting for pipeline",
            },
            {
              key: "progress",
              header: "Progress",
              cell: (run) => `${run.status === "completed" ? 100 : run.progress || 0}%`,
            },
            {
              key: "status",
              header: "Status",
              cell: (run) => <StatusBadge status={displayStatus(run)} />,
            },
            { key: "created_at", header: "Created At", cell: (run) => formatDate(run.created_at) },
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
      )}
    </section>
  );
}
