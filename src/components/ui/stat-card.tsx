import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
};

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon ? <div className="text-primary">{icon}</div> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-normal text-ink">{value}</p>
    </div>
  );
}
