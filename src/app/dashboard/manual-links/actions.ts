"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { read, utils } from "xlsx";
import { requireScraper } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { techStackValues } from "@/lib/tech-stacks";

export type ManualLinksActionState = {
  error?: string;
};

type ManualJobRow = {
  jobTitle: string;
  company: string;
  jobLink: string;
};

const REQUIRED_HEADERS = {
  jobTitle: ["jobtitle", "title"],
  company: ["company", "companyname"],
  jobLink: ["joblink", "link", "url", "joburl"],
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function findColumn(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function rowsToManualJobs(rows: string[][], fileType: "CSV" | "Excel"): ManualJobRow[] {
  if (rows.length < 2) {
    throw new Error(`Upload a ${fileType} file with a header row and at least one job row.`);
  }

  const headers = rows[0];
  const titleIndex = findColumn(headers, REQUIRED_HEADERS.jobTitle);
  const companyIndex = findColumn(headers, REQUIRED_HEADERS.company);
  const linkIndex = findColumn(headers, REQUIRED_HEADERS.jobLink);

  if (titleIndex === -1 || companyIndex === -1 || linkIndex === -1) {
    throw new Error(`${fileType} must include columns named Job Title, Company, and Job Link.`);
  }

  const seenLinks = new Set<string>();

  return rows
    .slice(1)
    .map((row) => ({
      jobTitle: (row[titleIndex] || "").trim(),
      company: (row[companyIndex] || "").trim(),
      jobLink: (row[linkIndex] || "").trim(),
    }))
    .filter((row) => {
      if (!row.jobTitle || !row.company || !row.jobLink || seenLinks.has(row.jobLink)) {
        return false;
      }

      seenLinks.add(row.jobLink);
      return true;
    });
}

function parseManualJobsFromCsv(csvText: string): ManualJobRow[] {
  return rowsToManualJobs(parseCsv(csvText.trim()), "CSV");
}

function parseManualJobsFromWorkbook(buffer: ArrayBuffer): ManualJobRow[] {
  const workbook = read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Upload an Excel file with at least one worksheet.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  return rowsToManualJobs(
    rows.map((row) => row.map((cell) => String(cell).trim())),
    "Excel",
  );
}

function fileKind(file: File) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv") || file.type === "text/csv") {
    return "csv";
  }

  if (
    name.endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx";
  }

  return null;
}

export async function uploadManualLinks(
  _state: ManualLinksActionState,
  formData: FormData,
): Promise<ManualLinksActionState> {
  const profile = await requireScraper();
  const supabase = await createClient();

  const techStack = String(formData.get("tech_stack") || "");
  const file = formData.get("csv_file");

  if (!techStackValues.includes(techStack)) {
    return { error: "Select a valid tech stack." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Upload a CSV or XLSX file with Job Title, Company, and Job Link columns." };
  }

  const kind = fileKind(file);

  if (!kind) {
    return { error: "Upload a .csv or .xlsx file." };
  }

  let jobs: ManualJobRow[];

  try {
    jobs = kind === "csv"
      ? parseManualJobsFromCsv(await file.text())
      : parseManualJobsFromWorkbook(await file.arrayBuffer());
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read the uploaded file." };
  }

  if (jobs.length === 0) {
    return { error: "No valid job rows were found in the uploaded file." };
  }

  const links = jobs.map((job) => job.jobLink);
  const { data: run, error: runError } = await supabase
    .from("scrape_runs")
    .insert({
      user_id: profile.id,
      tech_stack: techStack,
      keyword: "Manual upload",
      region: "",
      time_filter: "",
      source_urls: links,
      status: "completed",
      current_step: "Manual upload completed",
      status_message: `Saved ${jobs.length} job link(s) from ${kind.toUpperCase()}.`,
      progress: 100,
      total_results: jobs.length,
      error_message: null,
    })
    .select("id")
    .single();

  if (runError || !run) {
    return { error: runError?.message || "Could not create the manual upload run." };
  }

  const { error: jobsError } = await supabase.from("job_results").insert(
    jobs.map((job) => ({
      run_id: run.id,
      user_id: profile.id,
      job_title: job.jobTitle.slice(0, 500),
      company: job.company.slice(0, 300),
      job_link: job.jobLink,
      source_url: job.jobLink,
      posted_time: "Manual upload",
      tech_stack: techStack,
      keyword: "Manual upload",
      location: null,
      is_remote: true,
    })),
  );

  if (jobsError) {
    await supabase
      .from("scrape_runs")
      .update({
        status: "failed",
        current_step: "Manual upload failed",
        status_message: "The CSV run was created, but job links could not be saved.",
        total_results: 0,
        error_message: jobsError.message,
      })
      .eq("id", run.id);

    return { error: jobsError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/results");
  revalidatePath("/dashboard/history");
  redirect(`/dashboard/results?run_id=${run.id}`);
}
