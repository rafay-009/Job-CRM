import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "applied"
        ? "bg-emerald-50 text-emerald-700"
      : status === "admin"
        ? "bg-indigo-50 text-indigo-700"
      : status === "scraper"
        ? "bg-sky-50 text-sky-700"
      : status === "worker"
        ? "bg-slate-100 text-slate-700"
      : status === "new"
        ? "bg-slate-100 text-slate-700"
      : status === "failed"
        ? "bg-red-50 text-red-700"
        : status === "stalled"
          ? "bg-orange-50 text-orange-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", styles)}>
      {status}
    </span>
  );
}
