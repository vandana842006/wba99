import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "../../core/firebase";
import { ScrollText, RefreshCw, Search } from "lucide-react";

interface AuditLog {
  id: string;
  actorUid: string;
  action: string;
  targetId: string;
  details: Record<string, unknown>;
  timestamp?: { seconds: number } | string;
}

const ACTION_STYLES: Record<string, string> = {
  DELETE_USER: "bg-red-500/15 text-red-400",
  DELETE_ASSESSMENT: "bg-red-500/15 text-red-400",
  DELETE_ORGANISATION: "bg-red-500/15 text-red-400",
  SUSPEND_USER: "bg-orange-500/15 text-orange-400",
  UNSUSPEND_USER: "bg-emerald-500/15 text-emerald-400",
  GRANT_ADMIN: "bg-violet-500/15 text-violet-400",
  REVOKE_ADMIN: "bg-slate-500/15 text-slate-400",
  GRANT_OWNER: "bg-amber-500/15 text-amber-400",
  REVOKE_OWNER: "bg-slate-500/15 text-slate-400",
  RESET_PASSWORD: "bg-blue-500/15 text-blue-400",
  UPDATE_ORGANISATION: "bg-cyan-500/15 text-cyan-400",
};

function formatTs(val: { seconds: number } | string | undefined): string {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : new Date(val.seconds * 1000);
  return d.toLocaleString();
}

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = () => {
    setLoading(true);
    setError(null);
    const fn = httpsCallable<object, { logs: AuditLog[] }>(firebaseFunctions, "adminGetAuditLogs");
    fn({})
      .then((res) => setLogs(res.data.logs))
      .catch((err) => setError(err.message ?? "Failed to load audit logs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const allActions = ["all", ...Array.from(new Set(logs.map((l) => l.action)))];

  const filtered = logs.filter((l) => {
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    const matchesQuery =
      l.actorUid?.toLowerCase().includes(query.toLowerCase()) ||
      l.targetId?.toLowerCase().includes(query.toLowerCase()) ||
      l.action?.toLowerCase().includes(query.toLowerCase());
    return matchesAction && matchesQuery;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-black text-text">Audit Logs</h1>
          </div>
          <p className="text-sm text-text-muted">All admin actions recorded for accountability and traceability.</p>
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
            placeholder="Search by actor, target, or action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-text focus:outline-none focus:border-primary/50"
        >
          {allActions.map((a) => (
            <option key={a} value={a}>{a === "all" ? "All actions" : a.replace(/_/g, " ")}</option>
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
            {filtered.length} log{filtered.length !== 1 ? "s" : ""} (last 100)
          </p>

          {filtered.length === 0 ? (
            <div className="p-10 rounded-2xl border border-border bg-surface text-center">
              <ScrollText className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-text-muted text-sm">No audit logs yet.</p>
              <p className="text-text-muted text-[12px] mt-1">Admin actions will appear here once performed.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Timestamp</th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Action</th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Actor (UID)</th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Target (UID/ID)</th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l, i) => (
                      <tr
                        key={l.id}
                        className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-text/[0.02]"}`}
                      >
                        <td className="px-5 py-3 text-[12px] text-text-muted whitespace-nowrap">{formatTs(l.timestamp)}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${ACTION_STYLES[l.action] ?? "bg-text/10 text-text-muted"}`}>
                            {l.action?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[12px] text-text-muted">{l.actorUid?.slice(0, 12)}…</td>
                        <td className="px-5 py-3 font-mono text-[12px] text-text-muted">{l.targetId?.slice(0, 12)}…</td>
                        <td className="px-5 py-3 text-[12px] text-text-muted">
                          {Object.keys(l.details ?? {}).length > 0
                            ? Object.entries(l.details).map(([k, v]) => (
                              <span key={k} className="inline-block bg-text/5 rounded px-1.5 py-0.5 text-[10px] mr-1 mb-0.5">
                                {k}: {String(v)}
                              </span>
                            ))
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
