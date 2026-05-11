export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-white" />
    </div>
  );
}
