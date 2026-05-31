import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "../../core/firebase";
import {
  Users, ShieldCheck, ShieldOff, Search, RefreshCw, Trash2,
  Ban, UserCheck, Key, Crown, X, Copy, CheckCircle, AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isOwner: boolean;
  suspended: boolean;
  orgId?: string;
  createdAt?: { seconds: number } | string;
}

function formatDate(val: { seconds: number } | string | undefined): string {
  if (!val) return "—";
  if (typeof val === "string") return new Date(val).toLocaleDateString();
  return new Date(val.seconds * 1000).toLocaleDateString();
}

type Tab = "all" | "admins" | "owners" | "suspended";

interface ConfirmDialog {
  type: "delete" | "suspend" | "unsuspend" | "resetPassword" | "grantOwner" | "revokeOwner";
  userId: string;
  userName: string;
}

interface ResetLinkDialog {
  link: string;
  userName: string;
}

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);
  const [resetLink, setResetLink] = useState<ResetLinkDialog | null>(null);
  const [copied, setCopied] = useState(false);

  const isCurrentUserOwner = currentUser?.isAdmin === true || currentUser?.isOwner === true;

  const loadUsers = () => {
    setLoading(true);
    setError(null);
    const fn = httpsCallable<object, { users: AdminUser[] }>(firebaseFunctions, "adminGetAllUsers");
    fn({})
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(err.message ?? "Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const runAction = async (fn: () => Promise<void>, successMsg: string) => {
    try {
      await fn();
      toast.success(successMsg);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Action failed");
    } finally {
      setActionId(null);
      setConfirm(null);
    }
  };

  const toggleAdmin = (userId: string, current: boolean) => {
    setActionId(userId);
    const callFn = httpsCallable<{ userId: string; isAdmin: boolean }, { success: boolean }>(firebaseFunctions, "adminSetUserAdmin");
    runAction(async () => {
      await callFn({ userId, isAdmin: !current });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isAdmin: !current } : u));
    }, !current ? "Admin access granted" : "Admin access revoked");
  };

  const deleteUser = (u: AdminUser) => setConfirm({ type: "delete", userId: u.id, userName: u.name || u.email });
  const suspendUser = (u: AdminUser) => setConfirm({ type: u.suspended ? "unsuspend" : "suspend", userId: u.id, userName: u.name || u.email });
  const resetPassword = (u: AdminUser) => setConfirm({ type: "resetPassword", userId: u.id, userName: u.name || u.email });
  const toggleOwner = (u: AdminUser) => setConfirm({ type: u.isOwner ? "revokeOwner" : "grantOwner", userId: u.id, userName: u.name || u.email });

  const executeConfirm = async () => {
    if (!confirm) return;
    const { type, userId, userName } = confirm;
    setActionId(userId);

    if (type === "delete") {
      const fn = httpsCallable<{ userId: string }, { success: boolean }>(firebaseFunctions, "adminDeleteUser");
      await runAction(async () => {
        await fn({ userId });
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }, `${userName} deleted`);
    } else if (type === "suspend" || type === "unsuspend") {
      const fn = httpsCallable<{ userId: string; suspended: boolean }, { success: boolean }>(firebaseFunctions, "adminSuspendUser");
      const suspended = type === "suspend";
      await runAction(async () => {
        await fn({ userId, suspended });
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, suspended } : u));
      }, suspended ? `${userName} suspended` : `${userName} reactivated`);
    } else if (type === "resetPassword") {
      const fn = httpsCallable<{ userId: string }, { success: boolean; resetLink: string }>(firebaseFunctions, "adminResetUserPassword");
      setConfirm(null);
      try {
        const res = await fn({ userId });
        setResetLink({ link: res.data.resetLink, userName });
        toast.success("Password reset link generated");
      } catch (err: unknown) {
        toast.error((err as { message?: string })?.message ?? "Failed to generate reset link");
      } finally {
        setActionId(null);
      }
    } else if (type === "grantOwner" || type === "revokeOwner") {
      const fn = httpsCallable<{ userId: string; isOwner: boolean }, { success: boolean }>(firebaseFunctions, "adminSetOwner");
      const isOwner = type === "grantOwner";
      await runAction(async () => {
        await fn({ userId, isOwner });
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isOwner } : u));
      }, isOwner ? `Owner access granted to ${userName}` : `Owner access revoked from ${userName}`);
    }
  };

  const copyLink = async () => {
    if (!resetLink) return;
    await navigator.clipboard.writeText(resetLink.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabFiltered = users.filter((u) => {
    if (tab === "admins") return u.isAdmin;
    if (tab === "owners") return u.isOwner;
    if (tab === "suspended") return u.suspended;
    return true;
  });

  const filtered = tabFiltered.filter(
    (u) =>
      u.name?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase()) ||
      u.role?.toLowerCase().includes(query.toLowerCase())
  );

  const tabCounts = {
    all: users.length,
    admins: users.filter((u) => u.isAdmin).length,
    owners: users.filter((u) => u.isOwner).length,
    suspended: users.filter((u) => u.suspended).length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-2xl font-black text-text">Users</h1>
          </div>
          <p className="text-sm text-text-muted">Manage all registered accounts, roles, and access levels.</p>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-sm font-bold text-text-muted hover:text-text transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "admins", "owners", "suspended"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition border
              ${tab === t
                ? t === "suspended" ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : t === "owners" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : t === "admins" ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                  : "bg-primary/15 text-primary border-primary/30"
                : "bg-surface text-text-muted border-border hover:text-text"
              }`}
          >
            {t} <span className="opacity-60">({tabCounts[t]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name, email or role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
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
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="rounded-2xl border border-border overflow-hidden bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">User</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Role</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Status</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Joined</th>
                    <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => {
                    const isSelf = u.id === currentUser?.uid;
                    const busy = actionId === u.id;
                    return (
                      <tr
                        key={u.id}
                        className={`border-b border-border last:border-0 ${u.suspended ? "opacity-60" : ""} ${i % 2 === 0 ? "" : "bg-text/[0.02]"}`}
                      >
                        {/* User */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0
                              ${u.isOwner ? "bg-amber-500/20 text-amber-400"
                                : u.isAdmin ? "bg-violet-500/20 text-violet-400"
                                : "bg-primary/15 text-primary"}`}>
                              {u.name?.charAt(0).toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-text text-[13px] truncate flex items-center gap-1.5">
                                {u.name || "—"}
                                {u.isOwner && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                                {!u.isOwner && u.isAdmin && <ShieldCheck className="w-3 h-3 text-violet-400 flex-shrink-0" />}
                                {isSelf && <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">You</span>}
                              </p>
                              <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        {/* Role */}
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider
                            ${u.role === "physio" ? "bg-primary/15 text-primary" :
                              u.role === "research" ? "bg-cyan-500/15 text-cyan-400" :
                              "bg-text/10 text-text-muted"}`}>
                            {u.role}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-0.5">
                            {u.suspended ? (
                              <span className="flex items-center gap-1 text-red-400 text-[11px] font-bold">
                                <Ban className="w-3 h-3" /> Suspended
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            )}
                            {u.isOwner && (
                              <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                                <Crown className="w-3 h-3" /> Owner
                              </span>
                            )}
                            {!u.isOwner && u.isAdmin && (
                              <span className="flex items-center gap-1 text-violet-400 text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3" /> Admin
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Joined */}
                        <td className="px-5 py-3 text-text-muted text-[12px] whitespace-nowrap">{formatDate(u.createdAt)}</td>
                        {/* Actions */}
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Admin toggle */}
                            {!u.isOwner && (
                              <button
                                onClick={() => toggleAdmin(u.id, u.isAdmin)}
                                disabled={busy || isSelf}
                                title={u.isAdmin ? "Revoke admin" : "Grant admin"}
                                className={`p-1.5 rounded-lg transition disabled:opacity-40
                                  ${u.isAdmin
                                    ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20"
                                    : "bg-text/5 text-text-muted hover:text-violet-400 hover:bg-violet-500/10 border border-border"
                                  }`}
                              >
                                {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : u.isAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {/* Owner toggle (owner-only) */}
                            {isCurrentUserOwner && (
                              <button
                                onClick={() => toggleOwner(u)}
                                disabled={busy || isSelf}
                                title={u.isOwner ? "Revoke owner" : "Grant owner"}
                                className={`p-1.5 rounded-lg transition disabled:opacity-40
                                  ${u.isOwner
                                    ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                                    : "bg-text/5 text-text-muted hover:text-amber-400 hover:bg-amber-500/10 border border-border"
                                  }`}
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* Reset password */}
                            <button
                              onClick={() => resetPassword(u)}
                              disabled={busy}
                              title="Send password reset"
                              className="p-1.5 rounded-lg bg-text/5 text-text-muted hover:text-blue-400 hover:bg-blue-500/10 border border-border transition disabled:opacity-40"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            {/* Suspend/Unsuspend */}
                            <button
                              onClick={() => suspendUser(u)}
                              disabled={busy || isSelf}
                              title={u.suspended ? "Reactivate account" : "Suspend account"}
                              className={`p-1.5 rounded-lg transition disabled:opacity-40
                                ${u.suspended
                                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                  : "bg-text/5 text-text-muted hover:text-orange-400 hover:bg-orange-500/10 border border-border"
                                }`}
                            >
                              {u.suspended ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                            {/* Delete (owner-only) */}
                            {isCurrentUserOwner && (
                              <button
                                onClick={() => deleteUser(u)}
                                disabled={busy || isSelf}
                                title="Delete user"
                                className="p-1.5 rounded-lg bg-text/5 text-text-muted hover:text-red-400 hover:bg-red-500/10 border border-border transition disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-text-muted text-sm">
                        No users match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirm(null)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={() => setConfirm(null)} className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-text/10 transition">
              <X className="w-4 h-4" />
            </button>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4
              ${confirm.type === "delete" ? "bg-red-500/15" : confirm.type === "suspend" ? "bg-orange-500/15" : confirm.type === "grantOwner" ? "bg-amber-500/15" : "bg-blue-500/15"}`}>
              {confirm.type === "delete" ? <Trash2 className="w-5 h-5 text-red-400" />
                : confirm.type === "suspend" ? <Ban className="w-5 h-5 text-orange-400" />
                : confirm.type === "unsuspend" ? <UserCheck className="w-5 h-5 text-emerald-400" />
                : confirm.type === "resetPassword" ? <Key className="w-5 h-5 text-blue-400" />
                : <Crown className="w-5 h-5 text-amber-400" />}
            </div>
            <h3 className="text-lg font-black text-text mb-1">
              {confirm.type === "delete" ? "Delete User"
                : confirm.type === "suspend" ? "Suspend User"
                : confirm.type === "unsuspend" ? "Reactivate User"
                : confirm.type === "resetPassword" ? "Reset Password"
                : confirm.type === "grantOwner" ? "Grant Owner Access"
                : "Revoke Owner Access"}
            </h3>
            <p className="text-sm text-text-muted mb-5">
              {confirm.type === "delete"
                ? <>Are you sure you want to permanently delete <strong className="text-text">{confirm.userName}</strong>? Their account will be removed from Firebase Auth and Firestore. This cannot be undone.</>
                : confirm.type === "suspend"
                ? <>Suspend <strong className="text-text">{confirm.userName}</strong>? They will be unable to sign in until reactivated.</>
                : confirm.type === "unsuspend"
                ? <>Reactivate <strong className="text-text">{confirm.userName}</strong>? They will be able to sign in again.</>
                : confirm.type === "resetPassword"
                ? <>Generate a password reset link for <strong className="text-text">{confirm.userName}</strong>? You can share this link with them.</>
                : confirm.type === "grantOwner"
                ? <>Grant owner access to <strong className="text-text">{confirm.userName}</strong>? Owners have full control including deleting users and organisations.</>
                : <>Revoke owner access from <strong className="text-text">{confirm.userName}</strong>?</>}
            </p>
            {confirm.type === "delete" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-[11px] text-red-400 font-bold">Assessment data will remain in Firestore. Delete separately if needed.</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-text/5 border border-border text-sm font-bold text-text-muted hover:text-text transition">
                Cancel
              </button>
              <button
                onClick={executeConfirm}
                disabled={actionId === confirm.userId}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50
                  ${confirm.type === "delete" ? "bg-red-500 text-white hover:bg-red-600"
                    : confirm.type === "suspend" ? "bg-orange-500 text-white hover:bg-orange-600"
                    : confirm.type === "unsuspend" ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : confirm.type === "grantOwner" ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-primary text-white hover:opacity-90"
                  }`}
              >
                {actionId === confirm.userId ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Link Modal */}
      {resetLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResetLink(null)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setResetLink(null)} className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-text/10 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-black text-text mb-1">Password Reset Link</h3>
            <p className="text-sm text-text-muted mb-4">
              Share this link with <strong className="text-text">{resetLink.userName}</strong>. It expires after use.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={resetLink.link}
                className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-border text-[11px] font-mono text-text-muted focus:outline-none truncate"
              />
              <button
                onClick={copyLink}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition border
                  ${copied ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-surface border-border text-text-muted hover:text-text"}`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
