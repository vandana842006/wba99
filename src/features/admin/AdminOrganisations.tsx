import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "../../core/firebase";
import { Building2, RefreshCw, Search, Trash2, Edit2, X, AlertTriangle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

interface AdminOrg {
  id: string;
  name: string;
  type: string;
  adminUid: string;
  status?: string;
  subscription_plan?: string;
  createdAt?: { seconds: number } | string;
}

interface EditDialog {
  orgId: string;
  orgName: string;
  status: string;
  subscription_plan: string;
}

function formatDate(val: { seconds: number } | string | undefined): string {
  if (!val) return "—";
  if (typeof val === "string") return new Date(val).toLocaleDateString();
  return new Date(val.seconds * 1000).toLocaleDateString();
}

const PLAN_OPTIONS = ["free", "basic", "pro", "enterprise"];
const STATUS_OPTIONS = ["active", "inactive", "suspended"];

export function AdminOrganisations() {
  const { user: currentUser } = useAuth();
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialog | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isOwner = currentUser?.isAdmin === true || currentUser?.isOwner === true;

  const load = () => {
    setLoading(true);
    setError(null);
    const fn = httpsCallable<object, { organisations: AdminOrg[] }>(
      firebaseFunctions,
      "adminGetAllOrganisations"
    );
    fn({})
      .then((res) => setOrgs(res.data.organisations))
      .catch((err) => setError(err.message ?? "Failed to load organisations"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEdit = (o: AdminOrg) => setEditDialog({
    orgId: o.id,
    orgName: o.name,
    status: o.status || "active",
    subscription_plan: o.subscription_plan || "free",
  });

  const saveEdit = async () => {
    if (!editDialog) return;
    setActionId(editDialog.orgId);
    try {
      const fn = httpsCallable<{ orgId: string; status: string; subscription_plan: string }, { success: boolean }>(
        firebaseFunctions,
        "adminUpdateOrganisation"
      );
      await fn({ orgId: editDialog.orgId, status: editDialog.status, subscription_plan: editDialog.subscription_plan });
      setOrgs((prev) => prev.map((o) =>
        o.id === editDialog.orgId ? { ...o, status: editDialog.status, subscription_plan: editDialog.subscription_plan } : o
      ));
      toast.success("Organisation updated");
      setEditDialog(null);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to update organisation");
    } finally {
      setActionId(null);
    }
  };

  const deleteOrg = async () => {
    if (!deleteConfirmId) return;
    setActionId(deleteConfirmId);
    setDeleteConfirmId(null);
    try {
      const fn = httpsCallable<{ orgId: string }, { success: boolean }>(
        firebaseFunctions,
        "adminDeleteOrganisation"
      );
      await fn({ orgId: deleteConfirmId });
      setOrgs((prev) => prev.filter((o) => o.id !== deleteConfirmId));
      toast.success("Organisation deleted");
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to delete organisation");
    } finally {
      setActionId(null);
    }
  };

  const filtered = orgs.filter(
    (o) =>
      o.name?.toLowerCase().includes(query.toLowerCase()) ||
      o.adminUid?.toLowerCase().includes(query.toLowerCase()) ||
      o.status?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-text">Organisations</h1>
          </div>
          <p className="text-sm text-text-muted">All research organisations registered in the system.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-sm font-bold text-text-muted hover:text-text transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name, admin UID or status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-surface border border-border animate-pulse" />
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
            {filtered.length} organisation{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="rounded-2xl border border-border overflow-hidden bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Name</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Type</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Plan</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Status</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Admin UID</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Created</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o, i) => (
                    <tr
                      key={o.id}
                      className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-text/[0.02]"}`}
                    >
                      <td className="px-5 py-3 font-bold text-text whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-[11px] font-black text-amber-400 flex-shrink-0">
                            {o.name?.charAt(0).toUpperCase() ?? "O"}
                          </div>
                          {o.name || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400">
                          {o.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-muted text-[12px]">{o.subscription_plan || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider
                          ${o.status === "active" ? "bg-emerald-500/15 text-emerald-400"
                            : o.status === "suspended" ? "bg-red-500/15 text-red-400"
                            : "bg-text/10 text-text-muted"}`}>
                          {o.status === "active" && <CheckCircle className="w-3 h-3" />}
                          {o.status || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-[12px] text-text-muted">{o.adminUid?.slice(0, 12)}…</td>
                      <td className="px-5 py-3 text-text-muted text-[12px]">{formatDate(o.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(o)}
                            disabled={actionId === o.id}
                            title="Edit organisation"
                            className="p-1.5 rounded-lg bg-text/5 text-text-muted hover:text-amber-400 hover:bg-amber-500/10 border border-border transition disabled:opacity-40"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => setDeleteConfirmId(o.id)}
                              disabled={actionId === o.id}
                              title="Delete organisation"
                              className="p-1.5 rounded-lg bg-text/5 text-text-muted hover:text-red-400 hover:bg-red-500/10 border border-border transition disabled:opacity-40"
                            >
                              {actionId === o.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-text-muted text-sm">
                        No organisations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      {editDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditDialog(null)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={() => setEditDialog(null)} className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-text/10 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-4">
              <Edit2 className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-black text-text mb-1">Edit Organisation</h3>
            <p className="text-sm text-text-muted mb-5 font-bold">{editDialog.orgName}</p>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">Status</label>
                <select
                  value={editDialog.status}
                  onChange={(e) => setEditDialog({ ...editDialog, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:border-primary/50"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">Subscription Plan</label>
                <select
                  value={editDialog.subscription_plan}
                  onChange={(e) => setEditDialog({ ...editDialog, subscription_plan: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:border-primary/50"
                >
                  {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditDialog(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-text/5 border border-border text-sm font-bold text-text-muted hover:text-text transition">
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={actionId === editDialog.orgId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition disabled:opacity-50"
              >
                {actionId === editDialog.orgId ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={() => setDeleteConfirmId(null)} className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-text/10 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-black text-text mb-1">Delete Organisation</h3>
            <p className="text-sm text-text-muted mb-4">This will permanently remove the organisation. Member physios will be unlinked.</p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-[11px] text-red-400 font-bold">This action is irreversible.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-text/5 border border-border text-sm font-bold text-text-muted hover:text-text transition">
                Cancel
              </button>
              <button onClick={deleteOrg} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
