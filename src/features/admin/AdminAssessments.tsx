import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "../../core/firebase";
import { ClipboardList, RefreshCw, Search, Trash2, X, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface AdminAssessment {
  id: string;
  patientId: string;
  physioId: string;
  toolType: string;
  createdAt?: { seconds: number } | string;
}

const TOOL_COLORS: Record<string, string> = {
  fms: "bg-blue-500/15 text-blue-400",
  rom: "bg-emerald-500/15 text-emerald-400",
  msk: "bg-amber-500/15 text-amber-400",
  posture: "bg-pink-500/15 text-pink-400",
  gait: "bg-cyan-500/15 text-cyan-400",
  gait_clinical: "bg-teal-500/15 text-teal-400",
  inclinometer: "bg-violet-500/15 text-violet-400",
  prescription: "bg-orange-500/15 text-orange-400",
  facial_stress: "bg-rose-500/15 text-rose-400",
  spinal: "bg-indigo-500/15 text-indigo-400",
};

function formatDate(val: { seconds: number } | string | undefined): string {
  if (!val) return "—";
  if (typeof val === "string") return new Date(val).toLocaleDateString();
  return new Date(val.seconds * 1000).toLocaleDateString();
}

const PAGE_SIZE = 20;

export function AdminAssessments() {
  const [assessments, setAssessments] = useState<AdminAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const fn = httpsCallable<object, { assessments: AdminAssessment[] }>(
      firebaseFunctions,
      "adminGetAllAssessments"
    );
    fn({})
      .then((res) => setAssessments(res.data.assessments))
      .catch((err) => setError(err.message ?? "Failed to load assessments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteAssessment = async () => {
    if (!confirmId) return;
    setDeletingId(confirmId);
    setConfirmId(null);
    try {
      const fn = httpsCallable<{ assessmentId: string }, { success: boolean }>(
        firebaseFunctions,
        "adminDeleteAssessment"
      );
      await fn({ assessmentId: confirmId });
      setAssessments((prev) => prev.filter((a) => a.id !== confirmId));
      toast.success("Assessment deleted");
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to delete assessment");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = assessments.filter((a) => {
    const matchesType = typeFilter === "all" || a.toolType === typeFilter;
    const matchesQuery =
      a.id.toLowerCase().includes(query.toLowerCase()) ||
      a.physioId.toLowerCase().includes(query.toLowerCase()) ||
      a.patientId.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesQuery;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const toolTypes = ["all", ...Array.from(new Set(assessments.map((a) => a.toolType)))];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-text">Assessments</h1>
          </div>
          <p className="text-sm text-text-muted">All assessments across every physiotherapist.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-sm font-bold text-text-muted hover:text-text transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by ID, physio, or patient…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-text focus:outline-none focus:border-primary/50"
        >
          {toolTypes.map((t) => (
            <option key={t} value={t}>{t === "all" ? "All types" : t.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider">
            {filtered.length} assessment{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="rounded-2xl border border-border overflow-hidden bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">ID</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Type</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Physio ID</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Patient ID</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-text/[0.02]"}`}
                    >
                      <td className="px-5 py-3 font-mono text-[12px] text-text-muted">{a.id.slice(0, 14)}…</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${TOOL_COLORS[a.toolType] ?? "bg-text/10 text-text-muted"}`}>
                          {a.toolType}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-[12px] text-text-muted">{a.physioId.slice(0, 12)}…</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-text-muted">{a.patientId.slice(0, 12)}…</td>
                      <td className="px-5 py-3 text-text-muted text-[12px]">{formatDate(a.createdAt)}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setConfirmId(a.id)}
                          disabled={deletingId === a.id}
                          title="Delete assessment"
                          className="p-1.5 rounded-lg bg-text/5 text-text-muted hover:text-red-400 hover:bg-red-500/10 border border-border transition disabled:opacity-40"
                        >
                          {deletingId === a.id
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-muted text-sm">
                        No assessments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-sm font-bold text-text-muted hover:text-text disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted font-bold">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-sm font-bold text-text-muted hover:text-text disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirm */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={() => setConfirmId(null)} className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-text/10 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-black text-text mb-1">Delete Assessment</h3>
            <p className="text-sm text-text-muted mb-4">This will permanently remove the assessment record. This cannot be undone.</p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-[11px] text-red-400 font-bold font-mono">{confirmId.slice(0, 20)}…</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-text/5 border border-border text-sm font-bold text-text-muted hover:text-text transition">
                Cancel
              </button>
              <button onClick={deleteAssessment} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
