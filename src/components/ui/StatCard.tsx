import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  Icon: LucideIcon;
  accent?: string; // tailwind color suffix e.g. "primary", "emerald-500", "amber-500"
  sub?: string;
}

export function StatCard({ label, value, Icon, accent = "primary", sub }: StatCardProps) {
  return (
    <div className="bg-input border border-border rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div
        className={clsx(
          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
          `bg-${accent}/10`
        )}
      >
        <Icon className={clsx("w-5 h-5", `text-${accent}`)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
        <p className="text-2xl font-black text-text mt-0.5">{value}</p>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
