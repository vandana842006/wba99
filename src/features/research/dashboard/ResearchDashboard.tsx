import { useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { exportToCSV } from "../../../core/utils/exportCSV";
import { Button } from "../../../components/ui/Button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Download,
  FlaskConical,
  Activity,
  Filter,
  RefreshCw,
  Users,
  ChevronDown,
  Search,
  X,
  Shield,
  Clock,
  Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types & constants ─────────────────────────────────────────────────────────

interface AnonymizedAssessment {
  id: string;
  pseudoId: string;
  toolType: string;
  createdAt: { seconds: number } | string;
  data: Record<string, unknown>;
}

const TOOL_COLORS: Record<string, string> = {
  fms:          "#00b4d8",
  rom:          "#10b981",
  msk:          "#8b5cf6",
  posture:      "#f59e0b",
  gait:         "#0ea5e9",
  prescription: "#f43f5e",
};

const TOOL_LABELS: Record<string, string> = {
  fms:          "FMS",
  rom:          "ROM",
  msk:          "MSK",
  posture:      "Posture",
  gait:         "Gait",
  prescription: "Prescription",
};

const FILTERS = ["all", "fms", "rom", "msk", "posture", "gait", "prescription"];
const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(ts: { seconds: number } | string | undefined): string {
  if (!ts) return "—";
  try {
    const d = typeof ts === "object" && "seconds" in ts
      ? new Date(ts.seconds * 1000)
      : new Date(ts as string);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch { return "—"; }
}

function getKeyMetric(a: AnonymizedAssessment): string {
  const d = a.data;
  if (!d) return "—";
  if (a.toolType === "fms")          return `${d.total ?? "—"} / 21`;
  if (a.toolType === "posture")      return `${d.score ?? "—"}%`;
  if (a.toolType === "gait")         return `${d.total ?? "—"} / 15`;
  if (a.toolType === "rom")          return `${Object.keys((d.joints as object) ?? {}).length} joints`;
  if (a.toolType === "msk")          return `${d.totalAffected ?? 0} findings`;
  if (a.toolType === "prescription") return `${(d.exercises as unknown[])?.length ?? 0} exercises`;
  return "—";
}

// ── Filter Dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (v: string) => void;
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  const currentLabel = value === "all" ? "All Types" : (TOOL_LABELS[value] ?? value);
  const currentCount = value === "all" ? total : (counts[value] ?? 0);
  const currentColor = value === "all" ? "#94a3b8" : (TOOL_COLORS[value] ?? "#94a3b8");

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-input border border-border hover:border-primary/30 hover:bg-surface hover:shadow-md transition-all duration-300 text-sm text-text font-bold w-full sm:w-52 justify-between shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <div className="flex items-center gap-1.5">
            {value !== "all" && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentColor }} />
            )}
            <span>{currentLabel}</span>
          </div>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm"
            style={value !== "all"
              ? { backgroundColor: currentColor + "22", color: currentColor }
              : { backgroundColor: "var(--color-surface)", color: "var(--color-text-muted)" }}
          >
            {currentCount}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-300 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-full sm:w-52 z-30 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {FILTERS.map((f) => {
            const isAll = f === "all";
            const label = isAll ? "All Types" : (TOOL_LABELS[f] ?? f);
            const count = isAll ? total : (counts[f] ?? 0);
            const color = isAll ? "var(--color-text-muted)" : (TOOL_COLORS[f] ?? "var(--color-text-muted)");
            const active = f === value;
            return (
              <button
                key={f}
                type="button"
                onClick={() => { onChange(f); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-primary/5 ${active ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  {isAll
                    ? <Activity className="w-3.5 h-3.5 text-text-muted" />
                    : <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  }
                  <span className={`${active ? "font-black text-text" : "font-medium text-text-muted"}`}>{label}</span>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={active
                    ? { backgroundColor: color + "25", color }
                    : { backgroundColor: "var(--color-input)", color: "#64748b" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 animate-pulse">
      <div className="w-8 h-8 rounded-xl bg-input flex-shrink-0 shadow-inner" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 rounded bg-input" />
        <div className="h-2.5 w-20 rounded bg-input/50" />
      </div>
      <div className="h-2.5 w-14 rounded bg-input" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_100px_120px_100px] gap-4 items-center px-5 py-3.5 border-b border-border last:border-0 animate-pulse">
      <div className="h-3 w-28 rounded bg-input shadow-inner" />
      <div className="h-5 w-16 rounded-lg bg-input" />
      <div className="h-3 w-20 rounded bg-input" />
      <div className="h-3 w-16 rounded bg-input" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ResearchDashboard() {
  useAuth();
  const [data, setData] = useState<AnonymizedAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const fetchData = async (tool?: string) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<
        { toolType?: string; limit: number },
        { assessments: AnonymizedAssessment[] }
      >(firebaseFunctions, "getAnonymizedAssessments");
      const result = await fn({ toolType: tool && tool !== "all" ? tool : undefined, limit: 200 });
      setData(result.data.assessments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load research data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(toolFilter); }, [toolFilter]);

  // Derived
  const counts = data.reduce<Record<string, number>>((acc, a) => {
    acc[a.toolType] = (acc[a.toolType] ?? 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(counts).map(([tool, count]) => ({
    tool: TOOL_LABELS[tool] ?? tool,
    key: tool,
    count,
    color: TOOL_COLORS[tool] ?? "#94a3b8",
  })).sort((a, b) => b.count - a.count);

  const totalAssessments = data.length;
  const uniquePatients = new Set(data.map((a) => a.pseudoId)).size;

  const filtered = data
    .filter((a) => toolFilter === "all" || a.toolType === toolFilter)
    .filter((a) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        a.pseudoId.toLowerCase().includes(q) ||
        (TOOL_LABELS[a.toolType] ?? a.toolType).toLowerCase().includes(q)
      );
    });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleExport = () => {
    exportToCSV(
      filtered.map((a) => ({
        pseudo_id: a.pseudoId,
        tool_type: a.toolType,
        key_metric: getKeyMetric(a),
        recorded: formatTs(a.createdAt),
      })),
      `wba99-research-${toolFilter}-${Date.now()}`
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-1.5 w-6 bg-cyan-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Research</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">Data Explorer</h1>
          <p className="text-text-muted mt-0.5 text-sm">Anonymized, read-only clinical assessment data.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => fetchData(toolFilter)} loading={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={data.length === 0}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: loading ? "—" : totalAssessments, icon: Activity,    color: "#00b4d8", sub: "assessments" },
          { label: "Patients",value: loading ? "—" : uniquePatients,  icon: Users,       color: "#8b5cf6", sub: "anonymized"  },
          { label: "Tools",   value: loading ? "—" : chartData.length, icon: Layers,     color: "#10b981", sub: "active"      },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 text-center"
            style={{ backgroundColor: color + "18", border: `1px solid ${color}30` }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "25" }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-text leading-none">{value}</p>
            <div>
              <p className="text-xs font-bold text-text-muted">{label}</p>
              <p className="text-[10px] text-text-muted/60">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!loading && chartData.length > 0 && (
        <div className="bg-input border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-text-muted">By Tool Type</p>
            <span className="text-[10px] font-bold text-text-muted/60 uppercase tracking-wider">{totalAssessments} total</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="tool"
                tick={{ fill: "var(--color-text-muted)", fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-text-muted)", fontSize: 9, opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.75rem",
                  fontSize: "0.75rem",
                  color: "var(--color-text)",
                  padding: "8px 12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
                cursor={{ fill: "var(--color-input)", opacity: 0.5 }}
                formatter={(v: number | undefined) => [v ?? 0, "Assessments"]}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Distribution bars */}
          <div className="mt-4 space-y-2.5 border-t border-white/5 pt-4">
            {chartData.map(({ tool, key, count, color }) => {
              const pct = totalAssessments > 0 ? (count / totalAssessments) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-2.5 group/dist">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-text-muted w-20 flex-shrink-0 truncate">{tool}</span>
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }} />
                  </div>
                  <span className="text-xs font-black text-text w-6 text-right">{count}</span>
                  <span className="text-[10px] text-text-muted/60 w-8 text-right">{pct.toFixed(0)}%</span>
                  <button
                    onClick={() => { setToolFilter(key); setPage(0); }}
                    className="text-[10px] font-bold text-text-muted/60 hover:text-cyan-500 transition w-10 text-right"
                  >
                    Filter
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Records section */}
      <div className="space-y-3">

        {/* Section label + count */}
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cyan-500" />
          <p className="text-xs font-black uppercase tracking-widest text-text-muted">Records</p>
          {!loading && (
            <span className="px-1.5 py-0.5 rounded-md bg-input text-text-muted text-[10px] font-black shadow-inner">
              {filtered.length}
            </span>
          )}
        </div>

        {/* Filter dropdown + search */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <FilterDropdown
            value={toolFilter}
            onChange={(f) => { setToolFilter(f); setPage(0); }}
            counts={counts}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search pseudo ID or tool…"
              className="w-full pl-9 pr-9 py-2.5 bg-input border border-border rounded-2xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan-500/40 focus:bg-surface transition shadow-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(0); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table / cards */}
        {loading ? (
          <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden md:block">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
            <div className="md:hidden">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-red-500 font-bold text-sm">Unable to load data</p>
              <p className="text-text-muted text-xs mt-1">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => fetchData(toolFilter)} className="flex-shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-input border border-border rounded-2xl shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center shadow-inner">
              <FlaskConical className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-text-muted font-bold text-sm">No records found</p>
            <p className="text-text-muted/60 text-xs text-center px-4">
              {search ? "Try a different search term" : "No assessments for this filter"}
            </p>
            {(search || toolFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setToolFilter("all"); setPage(0); }}
                className="text-xs font-bold text-cyan-500 hover:text-cyan-600 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">

            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1fr_100px_130px_110px] gap-4 px-5 py-2.5 bg-surface/50 border-b border-border">
                {["Pseudo ID", "Tool", "Key Metric", "Recorded"].map((h) => (
                  <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{h}</p>
                ))}
              </div>
              {paged.map((a) => {
                const color = TOOL_COLORS[a.toolType] ?? "#94a3b8";
                return (
                  <div
                    key={a.id}
                    className="grid grid-cols-[1fr_100px_130px_110px] gap-4 items-center px-5 py-3 border-b border-border last:border-0 hover:bg-surface transition-all duration-200"
                  >
                    <p className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-bold truncate">{a.pseudoId}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs font-bold truncate" style={{ color }}>{TOOL_LABELS[a.toolType] ?? a.toolType}</span>
                    </div>
                    <p className="text-xs text-text-muted dark:text-text-muted font-semibold">{getKeyMetric(a)}</p>
                    <p className="text-[11px] text-text-muted/60">{formatTs(a.createdAt)}</p>
                  </div>
                );
              })}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {paged.map((a) => {
                const color = TOOL_COLORS[a.toolType] ?? "#94a3b8";
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface transition-all duration-200">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color + "20" }}
                    >
                      <span className="text-[10px] font-black" style={{ color }}>
                        {(TOOL_LABELS[a.toolType] ?? a.toolType).slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-bold truncate">{a.pseudoId}</p>
                      <p className="text-xs text-text-muted mt-0.5">{getKeyMetric(a)}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-text-muted/60 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{formatTs(a.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <p className="text-[11px] text-text-muted/60 font-medium">
              {filtered.length} records · page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-text-muted bg-input border border-border hover:bg-surface hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const n = totalPages <= 5 ? i : Math.max(0, page - 2) + i;
                if (n >= totalPages) return null;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-7 rounded-lg text-xs font-bold transition ${
                      n === page
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-text-muted hover:text-text hover:bg-white/5"
                    }`}
                  >
                    {n + 1}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-text-muted bg-input border border-border hover:bg-surface hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy notice */}
      <div className="rounded-2xl border border-border bg-input p-4 flex gap-3 items-start shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-text-muted/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-text-muted" />
        </div>
        <div>
          <p className="text-xs font-bold text-text-muted">Data Privacy</p>
          <p className="text-xs text-text-muted/60 mt-0.5 leading-relaxed">
            All patient identifiers are removed server-side. Pseudo IDs are one-way hashed and non-reversible.
            No PII is accessible to research accounts.
          </p>
        </div>
      </div>

    </div>
  );
}
