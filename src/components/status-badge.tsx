const STYLES: Record<string, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  SENT: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  VOID: "bg-slate-100 text-slate-400 line-through",
  MATCHED: "bg-emerald-100 text-emerald-800",
  UNMATCHED: "bg-red-100 text-red-700",
  MANUAL: "bg-sky-100 text-sky-800",
  IGNORED: "bg-slate-100 text-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[status] ?? "bg-slate-200 text-slate-700"}`}
    >
      {status}
    </span>
  );
}
