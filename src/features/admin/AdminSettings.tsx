import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "../../core/firebase";
import { Settings, Crown, ShieldCheck, RefreshCw, AlertTriangle, Users, X, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isOwner: boolean;
  suspended: boolean;
}

export function AdminSettings() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmOwner, setConfirmOwner] = useState<{ userId: string; userName: string; grant: boolean } | null>(null);

  const isAdmin = currentUser?.isAdmin === true || currentUser?.isOwner === true;

  useEffect(() => {
    const fn = httpsCallable<object, { users: AdminUser[] }>(firebaseFunctions, "adminGetAllUsers");
    fn({})
      .then((res) => setUsers(res.data.users))
      .finally(() => setLoading(false));
  }, []);

  const toggleOwner = async () => {
    if (!confirmOwner) return;
    const { userId, userName, grant } = confirmOwner;
    setActionId(userId);
    setConfirmOwner(null);
    try {
      const fn = httpsCallable<{ userId: string; isOwner: boolean }, { success: boolean }>(
        firebaseFunctions,
        "adminSetOwner"
      );
      await fn({ userId, isOwner: grant });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isOwner: grant } : u));
      toast.success(grant ? `Owner access granted to ${userName}` : `Owner access revoked from ${userName}`);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const owners = users.filter((u) => u.isOwner);
  const admins = users.filter((u) => u.isAdmin && !u.isOwner);
  const nonPrivileged = users.filter((u) => !u.isAdmin && !u.isOwner);

  if (!isAdmin) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
            <Settings className="w-4 h-4 text-slate-400" />
          </div>
          <h1 className="text-2xl font-black text-text">System Settings</h1>
        </div>
        <p className="text-sm text-text-muted">Owner-only controls for managing privileged access and system configuration.</p>
      </div>

      {/* Privilege Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Owners", value: owners.length, Icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          { label: "Admins", value: admins.length, Icon: ShieldCheck, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
          { label: "Regular Users", value: nonPrivileged.length, Icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        ].map(({ label, value, Icon, color, bg, border }) => (
          <div key={label} className={`p-5 rounded-2xl border ${bg} ${border}`}>
            <Icon className={`w-5 h-5 ${color} mb-3`} />
            <p className={`text-2xl font-black ${color}`}>{loading ? "—" : value}</p>
            <p className="text-sm font-bold text-text mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Owner Management */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <Crown className="w-4 h-4 text-amber-400" />
          <h2 className="font-black text-text">Owner Management</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-muted">
            Owners have full system control: they can delete users and organisations, and manage who holds owner and admin status.
            Only grant this to highly trusted individuals.
          </p>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-background border border-border animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.uid;
                return (
                  <div key={u.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition
                    ${u.isOwner ? "bg-amber-500/5 border-amber-500/20" : "bg-background border-border"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0
                        ${u.isOwner ? "bg-amber-500/20 text-amber-400" : "bg-text/10 text-text-muted"}`}>
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.isOwner ? (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-[11px] font-bold border border-amber-500/20">
                          <Crown className="w-3 h-3" /> Owner
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-text/5 text-text-muted text-[11px] font-bold border border-border">
                          {u.isAdmin ? <><ShieldCheck className="w-3 h-3" /> Admin</> : "User"}
                        </span>
                      )}
                      <button
                        onClick={() => setConfirmOwner({ userId: u.id, userName: u.name || u.email, grant: !u.isOwner })}
                        disabled={actionId === u.id || isSelf}
                        title={u.isOwner ? "Revoke owner" : "Grant owner"}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-40 border
                          ${u.isOwner
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20"
                          }`}
                      >
                        {actionId === u.id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : u.isOwner ? "Revoke" : "Grant Owner"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h2 className="font-black text-red-400">Danger Zone</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-muted">
            These actions are irreversible. Proceed with caution.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border">
              <div>
                <p className="text-sm font-bold text-text">Delete Users</p>
                <p className="text-[12px] text-text-muted mt-0.5">Permanently remove a user account from Auth and Firestore. Go to Users page.</p>
              </div>
              <button
                onClick={() => navigate("/admin/users")}
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold hover:bg-red-500/20 transition flex-shrink-0"
              >
                Go to Users
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border">
              <div>
                <p className="text-sm font-bold text-text">Delete Organisations</p>
                <p className="text-[12px] text-text-muted mt-0.5">Permanently remove a research organisation. Go to Organisations page.</p>
              </div>
              <button
                onClick={() => navigate("/admin/organisations")}
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold hover:bg-red-500/20 transition flex-shrink-0"
              >
                Go to Orgs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Access Legend */}
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <h2 className="font-black text-text flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> Access Level Reference
        </h2>
        <div className="space-y-3 text-sm">
          {[
            { icon: <Crown className="w-4 h-4 text-amber-400" />, label: "Owner", color: "text-amber-400", perms: ["Full system access", "Delete users & orgs", "Manage owner/admin roles", "All admin capabilities"] },
            { icon: <ShieldCheck className="w-4 h-4 text-violet-400" />, label: "Admin", color: "text-violet-400", perms: ["View all data", "Suspend users", "Reset passwords", "Edit organisations", "Delete assessments", "View audit logs"] },
            { icon: <Users className="w-4 h-4 text-blue-400" />, label: "User (Physio/Research)", color: "text-blue-400", perms: ["Own data only", "Use assigned tools", "No admin panel access"] },
          ].map(({ icon, label, color, perms }) => (
            <div key={label} className="p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className={`font-bold text-[13px] ${color}`}>{label}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {perms.map((p) => (
                  <span key={p} className="text-[11px] bg-text/5 border border-border rounded-lg px-2 py-1 text-text-muted">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Owner Dialog */}
      {confirmOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmOwner(null)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={() => setConfirmOwner(null)} className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-text/10 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-black text-text mb-1">
              {confirmOwner.grant ? "Grant Owner Access" : "Revoke Owner Access"}
            </h3>
            <p className="text-sm text-text-muted mb-5">
              {confirmOwner.grant
                ? <><strong className="text-text">{confirmOwner.userName}</strong> will gain full owner-level control over the system.</>
                : <>Revoke owner access from <strong className="text-text">{confirmOwner.userName}</strong>? They will retain admin access if previously granted.</>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOwner(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-text/5 border border-border text-sm font-bold text-text-muted hover:text-text transition">
                Cancel
              </button>
              <button
                onClick={toggleOwner}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition
                  ${confirmOwner.grant ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-red-500 text-white hover:bg-red-600"}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
