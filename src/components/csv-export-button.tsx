"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobResult } from "@/lib/types";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function CsvExportButton({ results }: { results: JobResult[] }) {
  function exportCsv() {
    const headers = ["Job Title", "Company", "Link", "Posted Time", "Keyword", "Source"];
    const rows = results.map((job) => [
      job.job_title,
      job.company,
      job.job_link,
      job.posted_time,
      job.keyword,
      job.source_url,
    ]);

    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mavericks-united-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button onClick={exportCsv} disabled={results.length === 0} variant="secondary">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
