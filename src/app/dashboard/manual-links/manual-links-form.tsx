"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { techStackOptions } from "@/lib/tech-stacks";
import { uploadManualLinks, type ManualLinksActionState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <Upload className="h-4 w-4" />
      {pending ? "Uploading links..." : "Upload file"}
    </Button>
  );
}

export function ManualLinksForm() {
  const [state, action] = useActionState<ManualLinksActionState, FormData>(uploadManualLinks, {});

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Tech stack</span>
          <Select name="tech_stack" options={techStackOptions} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">CSV or XLSX file</span>
          <Input
            name="csv_file"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
        </label>
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-surface px-4 py-3 text-sm font-medium text-muted">
        Upload a CSV or XLSX file with columns: <span className="font-semibold text-ink">Job Title</span>,{" "}
        <span className="font-semibold text-ink">Company</span>, and{" "}
        <span className="font-semibold text-ink">Job Link</span>.
      </div>

      {state.error ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
