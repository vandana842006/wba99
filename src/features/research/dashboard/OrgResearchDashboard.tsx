import { useEffect, useRef, useState, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { firebaseFunctions, firebaseDB } from "../../../core/firebase";
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
  Building2,
  Users,
  Activity,
  FlaskConical,
  RefreshCw,
  Download,
  TrendingUp,
  BookOpen,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  Shield,
  FileText,
  Layers,
  Wallet,
  BarChart2,
  UserCheck,
  Filter,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnonymizedAssessment {
  id: string;
  pseudoId: string;
  toolType: string;
  createdAt: { seconds: number } | string;
  data: Record<string, unknown>;
}

interface OrgInfo {
  name: string;
  type: string;
  status?: string;
  subscription_plan?: string;
  credits_balance?: number;
}

interface PhysioMember {
  id: string;
  name?: string;
  email?: string;
  account_activated?: boolean;
}

interface Publication {
  id: string;
  orgId: string;
  title: string;
  conditionType: string;
  abstract: string;
  status: "draft" | "pending" | "approved";
  totalPatients: number;
  createdAt: { seconds: number } | string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TOOL_COLORS: Record<string, string> = {
  fms: "#00b4d8",
  rom: "#10b981",
  msk: "#8b5cf6",
  posture: "#f59e0b",
  gait: "#0ea5e9",
  inclinometer: "#f43f5e",
};

const TOOL_LABELS: Record<string, string> = {
  fms: "FMS",
  rom: "ROM",
  msk: "MSK",
  posture: "Posture",
  gait: "Gait",
  inclinometer: "Inclinometer",
};

const FILTERS = ["all", "fms", "rom", "msk", "posture", "gait", "inclinometer"];
const PAGE_SIZE = 12;

const TYPE_COLORS = ["#4CAF50", "#2196F3", "#9C27B0", "#F59E0B", "#EF4444", "#06B6D4", "#7C3AED"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: { seconds: number } | string | undefined): string {
  if (!ts) return "—";
  try {
    const d =
      typeof ts === "object" && "seconds" in ts
        ? new Date(ts.seconds * 1000)
        : new Date(ts as string);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function getKeyMetric(a: AnonymizedAssessment): string {
  const d = a.data;
  if (!d) return "—";
  if (a.toolType === "fms") return `Score: ${d.total ?? "—"}/21`;
  if (a.toolType === "posture") return `Score: ${d.score ?? "—"}%`;
  if (a.toolType === "gait") return `Score: ${d.total ?? "—"}/15`;
  if (a.toolType === "rom") return `${Object.keys((d.joints as object) ?? {}).length} joints`;
  if (a.toolType === "msk") return `${d.totalAffected ?? 0} findings`;
  if (a.toolType === "inclinometer") return `${Object.keys((d.measurements as object) ?? {}).length} measurements`;
  return "—";
}

function formatTs(ts: { seconds: number } | string | undefined): string {
  if (!ts) return "—";
  try {
    const d =
      typeof ts === "object" && "seconds" in ts
        ? new Date(ts.seconds * 1000)
        : new Date(ts as string);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
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
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentColor }} />
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
                    : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  }
                  <span className={`font-${active ? "black" : "medium"} ${active ? "text-text" : "text-text-muted"}`}>{label}</span>
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

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-3.5 border-b border-border last:border-0 animate-pulse">
      <div className="h-3 w-5 rounded bg-input shadow-inner" />
      <div className="h-3 w-24 rounded bg-input" />
      <div className="h-5 w-16 rounded-lg bg-input" />
      <div className="h-3 w-20 rounded bg-input" />
      <div className="h-3 w-14 rounded bg-input" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 animate-pulse">
      <div className="w-8 h-8 rounded-xl bg-input flex-shrink-0 shadow-inner" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 rounded bg-input" />
        <div className="h-2.5 w-16 rounded bg-input/50" />
      </div>
      <div className="h-3 w-14 rounded bg-input" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OrgResearchDashboard() {
  const { user } = useAuth();

  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [assessments, setAssessments] = useState<AnonymizedAssessment[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [physios, setPhysios] = useState<PhysioMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pubLoading, setPubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", conditionType: "", abstract: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchOrgInfo = async () => {
    if (!user?.orgId) return;
    try {
      const snap = await getDoc(doc(firebaseDB, "organizations", user.orgId));
      if (snap.exists()) {
        const d = snap.data();
        setOrgInfo({
          name: d.name ?? "Research Organisation",
          type: d.type ?? "research",
          status: d.status ?? "active",
          subscription_plan: d.subscription_plan ?? d.plan ?? "standard",
          credits_balance: d.credits_balance ?? d.credits ?? 0,
        });
      }
    } catch {
      // non-critical
    }
  };

  const fetchPhysios = async () => {
    try {
      const fn = httpsCallable<void, { members: PhysioMember[] }>(firebaseFunctions, "getOrgMembers");
      const result = await fn();
      setPhysios(result.data.members);
    } catch {
      // silently ignore — physio list is non-critical
    }
  };

  const fetchAssessments = async (tool?: string) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<
        { toolType?: string; limit: number },
        { assessments: AnonymizedAssessment[] }
      >(firebaseFunctions, "getAnonymizedAssessments");
      const result = await fn({
        toolType: tool && tool !== "all" ? tool : undefined,
        limit: 500,
      });
      setAssessments(result.data.assessments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assessment data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPublications = async () => {
    if (!user?.orgId) return;
    setPubLoading(true);
    try {
      const q = query(
        collection(firebaseDB, "publications"),
        where("orgId", "==", user.orgId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setPublications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Publication)));
    } catch {
      // collection may not exist yet
    } finally {
      setPubLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgInfo();
    fetchPhysios();
    fetchAssessments(toolFilter);
    fetchPublications();
  }, [user?.orgId]);

  useEffect(() => {
    fetchAssessments(toolFilter);
    setPage(0);
    setSearch("");
  }, [toolFilter]);

  // ── Publications ──────────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (!form.title.trim() || !form.conditionType.trim()) {
      setFormError("Title and condition type are required.");
      return;
    }
    if (!user?.orgId) {
      setFormError("Organisation not linked. Please contact support.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await addDoc(collection(firebaseDB, "publications"), {
        orgId: user.orgId,
        title: form.title.trim(),
        conditionType: form.conditionType.trim().toLowerCase(),
        abstract: form.abstract.trim(),
        status: "pending",
        totalPatients: uniquePatients,
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setForm({ title: "", conditionType: "", abstract: "" });
      await fetchPublications();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to submit publication.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
    setForm({ title: "", conditionType: "", abstract: "" });
  };

  const handleLinkPhysio = async () => {
    if (!linkEmail.trim()) { setLinkError("Enter a physio email address."); return; }
    setLinking(true);
    setLinkError(null);
    try {
      const fn = httpsCallable<{ email: string }, { success: boolean; physio: PhysioMember }>(
        firebaseFunctions, "linkPhysioToOrg"
      );
      const result = await fn({ email: linkEmail.trim().toLowerCase() });
      setPhysios((prev) => {
        if (prev.find((p) => p.id === result.data.physio.id)) return prev;
        return [...prev, result.data.physio];
      });
      setShowLinkModal(false);
      setLinkEmail("");
      await fetchAssessments(toolFilter);
    } catch (e: any) {
      setLinkError(e?.message ?? "Failed to link physio. Check the email and try again.");
    } finally {
      setLinking(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const uniquePatients = useMemo(
    () => new Set(assessments.map((a) => a.pseudoId)).size,
    [assessments]
  );

  const assessmentByType = useMemo(
    () =>
      assessments.reduce<Record<string, number>>((acc, a) => {
        acc[a.toolType] = (acc[a.toolType] ?? 0) + 1;
        return acc;
      }, {}),
    [assessments]
  );

  const chartData = useMemo(
    () =>
      Object.entries(assessmentByType)
        .map(([tool, count]) => ({
          tool: TOOL_LABELS[tool] ?? tool,
          key: tool,
          count,
          color: TOOL_COLORS[tool] ?? "#94a3b8",
        }))
        .sort((a, b) => b.count - a.count),
    [assessmentByType]
  );

  const topTool = chartData[0]?.tool ?? "—";
  const avgPerPatient =
    uniquePatients > 0 ? (assessments.length / uniquePatients).toFixed(1) : "—";

  const counts = useMemo(() => assessmentByType, [assessmentByType]);

  const filtered = useMemo(() => {
    let base = toolFilter === "all" ? assessments : assessments.filter((a) => a.toolType === toolFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter(
        (a) =>
          a.pseudoId.toLowerCase().includes(q) ||
          (TOOL_LABELS[a.toolType] ?? a.toolType).toLowerCase().includes(q)
      );
    }
    return base;
  }, [assessments, toolFilter, search]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleExport = () => {
    const rows = filtered.map((a) => ({
      pseudo_id: a.pseudoId,
      tool_type: a.toolType,
      key_metric: getKeyMetric(a),
      recorded: formatTs(a.createdAt),
    }));
    exportToCSV(rows, `wba99-org-research-${toolFilter}-${Date.now()}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-1.5 w-6 bg-cyan-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Organisation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">Research Dashboard</h1>
          <p className="text-text-muted mt-0.5 text-sm">
            {orgInfo?.name ?? user?.name ?? "Research Organisation"}
            {user?.orgId && (
              <span className="ml-2 font-mono text-[11px] text-text-muted/60">#{user.orgId.slice(0, 8)}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { fetchAssessments(toolFilter); fetchPublications(); fetchOrgInfo(); fetchPhysios(); }}
            loading={loading}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={assessments.length === 0}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Org Info Card ── */}
      <div className="bg-input border-2 border-cyan-500/30 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Building2 className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-black text-text truncate">
              {orgInfo?.name ?? "Research Organisation"}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  orgInfo?.status === "active"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {orgInfo?.status ?? "Active"}
              </span>
              {orgInfo?.subscription_plan && (
                <span className="text-[11px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                  {orgInfo.subscription_plan}
                </span>
              )}
              <span className="text-[11px] font-bold text-text-muted capitalize">
                {orgInfo?.type ?? "research"} org
              </span>
            </div>
          </div>
        </div>
        {(orgInfo?.credits_balance !== undefined) && (
          <div className="flex items-center gap-2 bg-surface rounded-xl px-4 py-2.5 border border-border shadow-inner">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {orgInfo.credits_balance.toLocaleString()} Credits Available
            </span>
          </div>
        )}
      </div>

      {/* ── Stats Grid (colored cards like org portal) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Assessments",
            value: loading ? "—" : assessments.length,
            icon: Activity,
            bg: "#4CAF50",
            sub: "all time",
          },
          {
            label: "Unique Patients",
            value: loading ? "—" : uniquePatients,
            icon: Users,
            bg: "#2196F3",
            sub: "anonymized",
          },
          {
            label: "Tool Types",
            value: loading ? "—" : chartData.length,
            icon: Layers,
            bg: "#9C27B0",
            sub: "active",
          },
          {
            label: "Publications",
            value: publications.length,
            icon: BookOpen,
            bg: "#FF9800",
            sub: pubLoading ? "loading…" : `${publications.filter((p) => p.status === "approved").length} approved`,
          },
        ].map(({ label, value, icon: Icon, bg, sub }) => (
          <div
            key={label}
            className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2 min-h-[130px]"
            style={{ backgroundColor: bg }}
          >
            <Icon className="w-8 h-8 text-white opacity-90" />
            <p className="text-4xl font-black text-white leading-none">{value}</p>
            <div className="text-center">
              <p className="text-sm font-bold text-white/90 leading-tight">{label}</p>
              {sub && <p className="text-[10px] text-white/60 mt-0.5">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-3">
          ⚡ Quick Actions
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: "Export Data",
              desc: "Download CSV",
              icon: Download,
              color: "#00b4d8",
              action: handleExport,
              disabled: assessments.length === 0,
            },
            {
              title: "New Publication",
              desc: "Submit research",
              icon: BookOpen,
              color: "#f59e0b",
              action: () => setShowModal(true),
              disabled: false,
            },
            {
              title: "View Analytics",
              desc: "Charts & insights",
              icon: BarChart2,
              color: "#10b981",
              action: () => window.scrollTo({ top: 600, behavior: "smooth" }),
              disabled: false,
            },
            {
              title: "Privacy Info",
              desc: "Data protection",
              icon: Shield,
              color: "#8b5cf6",
              action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
              disabled: false,
            },
          ].map(({ title, desc, icon: Icon, color, action, disabled }) => (
            <button
              key={title}
              onClick={action}
              disabled={disabled}
              className="bg-input border border-border rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-surface hover:border-primary/30 hover:shadow-md transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
                style={{ backgroundColor: color + "20" }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-sm font-black text-text">{title}</p>
              <p className="text-[11px] text-text-muted/60">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-400">Failed to load data</p>
            <p className="text-text-muted text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchAssessments(toolFilter)}
            className="ml-auto text-xs font-bold text-red-400 hover:text-red-300 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Analytics ── */}
      {!loading && assessments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Bar Chart */}
          <div className="lg:col-span-3 bg-input border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black uppercase tracking-widest text-text-muted">
                Assessments by Tool
              </p>
              <span className="text-[10px] font-bold text-text-muted/60 uppercase tracking-wider">
                {assessments.length} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                  formatter={(value: number | undefined) => [value ?? 0, "Assessments"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key Metrics */}
          <div className="lg:col-span-2 bg-input border border-border rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-1">
              Key Metrics
            </p>
            {[
              { label: "Most Used Tool", value: topTool, icon: TrendingUp, color: "#10b981" },
              { label: "Avg / Patient", value: `${avgPerPatient} assessments`, icon: Activity, color: "#00b4d8" },
              { label: "Coverage", value: `${uniquePatients} patients`, icon: Users, color: "#8b5cf6" },
              { label: "Tool Diversity", value: `${chartData.length} of ${FILTERS.length - 1} tools`, icon: FlaskConical, color: "#f59e0b" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border shadow-sm"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner"
                  style={{ backgroundColor: color + "18" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted/60 font-black">{label}</p>
                  <p className="text-sm font-black text-text truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tool Distribution ── */}
      {!loading && chartData.length > 0 && (
        <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-4">
            📋 Assessment Types Distribution
          </p>
          <div className="space-y-3">
            {chartData.map(({ tool, key, count, color }, index) => {
              const pct = assessments.length > 0 ? (count / assessments.length) * 100 : 0;
              return (
                <div key={tool} className="flex items-center gap-3 group/dist">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[index % TYPE_COLORS.length] }} />
                  <div className="w-16 flex-shrink-0">
                    <span className="text-xs font-bold text-text-muted truncate">{tool}</span>
                  </div>
                  <div className="flex-1 h-2 bg-border rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
                    />
                  </div>
                  <div className="w-20 flex-shrink-0 flex items-center justify-end gap-2">
                    <span className="text-xs font-black text-text">{count}</span>
                    <span className="text-[10px] text-text-muted/60 w-8 text-right">{pct.toFixed(0)}%</span>
                  </div>
                  <button
                    onClick={() => { setToolFilter(key); setPage(0); }}
                    className="text-[10px] font-bold text-text-muted/60 hover:text-cyan-500 transition w-10 text-right"
                  >
                    View →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Team Members ── */}
      <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-black uppercase tracking-widest text-text-muted">
              Team Members
            </p>
            {physios.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-black">
                {physios.length}
              </span>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => { setShowLinkModal(true); setLinkError(null); setLinkEmail(""); }}>
            <Plus className="w-3.5 h-3.5" />
            Add Physio
          </Button>
        </div>

        {physios.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3 px-6">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center shadow-inner">
              <Users className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-text-muted font-bold">No physios linked yet</p>
            <p className="text-text-muted/60 text-xs text-center">Add a physio by their email to start seeing their anonymized assessment data.</p>
            <button
              onClick={() => { setShowLinkModal(true); setLinkError(null); setLinkEmail(""); }}
              className="mt-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all duration-300"
            >
              Link First Physio
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {physios.slice(0, 5).map((physio) => (
              <div key={physio.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface transition-all duration-200">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-base font-black text-cyan-600 dark:text-cyan-400">
                    {physio.name?.[0]?.toUpperCase() ?? "P"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text truncate">{physio.name ?? "Physio"}</p>
                  <p className="text-xs text-text-muted/60 truncate">{physio.email}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    physio.account_activated
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {physio.account_activated ? "Active" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Assessment Records ── */}
      <div className="space-y-3">

        {/* Section header */}
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <p className="text-xs font-black uppercase tracking-widest text-text-muted">Assessment Records</p>
          {!loading && (
            <span className="px-1.5 py-0.5 rounded-md bg-input text-text-muted text-[10px] font-black shadow-inner">
              {filtered.length}
            </span>
          )}
        </div>

        {/* Filter dropdown + Search */}
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
              className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-2xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan-500/40 focus:bg-surface transition shadow-sm"
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

        {/* Table — desktop */}
        <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[2.5rem_1fr_120px_1fr_110px] gap-3 px-5 py-2.5 bg-surface/50 border-b border-border">
            {["#", "Pseudo ID", "Tool", "Key Metric", "Recorded"].map((h) => (
              <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{h}</p>
            ))}
          </div>

          {/* Loading */}
          {loading ? (
            <>
              <div className="hidden md:block">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
              <div className="md:hidden">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center shadow-inner">
                <FlaskConical className="w-6 h-6 text-text-muted" />
              </div>
              <p className="text-text-muted text-sm font-bold">No records found</p>
              <p className="text-text-muted/60 text-xs text-center">
                {search ? "Try a different search term" : "No assessments for this filter"}
              </p>
              {(search || toolFilter !== "all") && (
                <button
                  onClick={() => { setSearch(""); setToolFilter("all"); setPage(0); }}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition mt-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop rows */}
              <div className="hidden md:block">
                {paged.map((a, i) => {
                  const color = TOOL_COLORS[a.toolType] ?? "#94a3b8";
                  return (
                    <div
                      key={a.id}
                      className="grid grid-cols-[2.5rem_1fr_120px_1fr_110px] gap-3 items-center px-5 py-3 border-b border-border last:border-0 hover:bg-surface transition-all duration-200"
                    >
                      <span className="text-[10px] font-bold text-text-muted/40 tabular-nums">
                        {page * PAGE_SIZE + i + 1}
                      </span>
                      <p className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-bold truncate">{a.pseudoId}</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-bold" style={{ color }}>{TOOL_LABELS[a.toolType] ?? a.toolType}</span>
                      </div>
                      <p className="text-xs text-text-muted font-semibold truncate">{getKeyMetric(a)}</p>
                      <p className="text-[11px] text-text-muted/60">{formatTs(a.createdAt)}</p>
                    </div>
                  );
                })}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {paged.map((a, i) => {
                  const color = TOOL_COLORS[a.toolType] ?? "#94a3b8";
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface transition-all duration-200">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black shadow-inner"
                        style={{ backgroundColor: color + "20", color }}
                      >
                        {page * PAGE_SIZE + i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-bold truncate">{a.pseudoId}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-bold" style={{ color }}>{TOOL_LABELS[a.toolType] ?? a.toolType}</span>
                          <span className="text-[10px] text-border">·</span>
                          <span className="text-[11px] text-text-muted">{getKeyMetric(a)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-text-muted/60 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{formatTs(a.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
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
                const pageNum = totalPages <= 5 ? i : Math.max(0, page - 2) + i;
                if (pageNum >= totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-7 rounded-lg text-xs font-bold transition ${
                      pageNum === page
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-slate-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {pageNum + 1}
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

      {/* ── Research Publications ── */}
      <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-black uppercase tracking-widest text-text-muted">Publications</p>
            {publications.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black">
                {publications.length}
              </span>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-3.5 h-3.5" />
            New Publication
          </Button>
        </div>

        {pubLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-amber-400/50 border-t-amber-400 animate-spin" />
          </div>
        ) : publications.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 px-6">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center shadow-inner">
              <FileText className="w-6 h-6 text-text-muted/40" />
            </div>
            <p className="text-text-muted font-bold">No publications yet</p>
            <p className="text-text-muted/60 text-xs text-center max-w-xs">
              Submit anonymized research findings for peer review and approval.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all duration-300"
            >
              Create First Publication
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-surface transition-all duration-200 group"
              >
                <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
                  <FileText className="w-4 h-4 text-text-muted/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text leading-snug">{pub.title}</p>
                  {pub.abstract && (
                    <p className="text-xs text-text-muted/60 mt-0.5 line-clamp-1">{pub.abstract}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-surface text-[10px] font-bold text-text-muted/60 border border-border capitalize">
                      {pub.conditionType.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-text-muted/40">{pub.totalPatients} patients</span>
                    <span className="text-[10px] text-text-muted/40">·</span>
                    <span className="text-[10px] text-text-muted/40">{formatDate(pub.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      pub.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : pub.status === "pending"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-surface text-text-muted border border-border"
                    }`}
                  >
                    {pub.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-muted/40 group-hover:text-text transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Privacy Notice ── */}
      <div className="rounded-2xl border border-border bg-input p-4 flex gap-3 items-start shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-text-muted/10 flex items-center justify-center flex-shrink-0 shadow-inner">
          <Shield className="w-4 h-4 text-text-muted" />
        </div>
        <div>
          <p className="text-xs font-bold text-text-muted">Data Privacy</p>
          <p className="text-xs text-text-muted/60 mt-0.5 leading-relaxed">
            All patient identifiers are stripped server-side. Pseudo IDs are one-way hashed and
            non-reversible. No PII is accessible to research accounts.
          </p>
        </div>
      </div>

      {/* ── Publish Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in transition-all duration-300"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-input">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shadow-inner">
                  <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-text">New Publication</p>
                  <p className="text-[10px] text-text-muted/60">Submit for admin review</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-7 h-7 rounded-lg text-text-muted hover:text-text hover:bg-surface transition flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mb-1.5">
                  Research Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Back Pain Treatment Outcomes 2026"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan-500/50 focus:bg-surface transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mb-1.5">
                  Condition Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.conditionType}
                  onChange={(e) => setForm({ ...form, conditionType: e.target.value })}
                  placeholder="e.g. back_pain, knee_injury, shoulder"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan-500/50 focus:bg-surface transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mb-1.5">
                  Abstract
                </label>
                <textarea
                  value={form.abstract}
                  onChange={(e) => setForm({ ...form, abstract: e.target.value })}
                  placeholder="Brief description of your research findings and methodology…"
                  rows={3}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan-500/50 focus:bg-surface transition resize-none shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border shadow-inner">
                <Users className="w-4 h-4 text-text-muted flex-shrink-0" />
                <p className="text-xs text-text-muted">
                  Submitted with{" "}
                  <strong className="text-text-muted font-black">{uniquePatients} anonymized patients</strong> from
                  your current dataset.
                </p>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400 font-bold">{formError}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-input">
              <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handlePublish} loading={submitting}>
                <BookOpen className="w-3.5 h-3.5" />
                Submit for Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link Physio Modal ── */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in transition-all duration-300"
          onClick={(e) => e.target === e.currentTarget && setShowLinkModal(false)}
        >
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-input">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shadow-inner">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-text">Link Physio</p>
                  <p className="text-[10px] text-text-muted/60">Connect an existing physio to your org</p>
                </div>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="w-7 h-7 rounded-lg text-text-muted hover:text-text hover:bg-surface transition flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-text-muted leading-relaxed">
                Enter the email of a physio who already has an account. Their anonymized assessment data will immediately become visible in your dashboard.
              </p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mb-1.5">
                  Physio Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLinkPhysio()}
                  placeholder="physio@example.com"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 focus:bg-surface transition shadow-sm"
                />
              </div>

              {linkError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400 font-bold">{linkError}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-input flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowLinkModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleLinkPhysio} loading={linking}>
                <UserCheck className="w-3.5 h-3.5" />
                Link Physio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
