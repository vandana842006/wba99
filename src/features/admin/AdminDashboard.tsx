import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "../../core/firebase";
import { Users, ClipboardList, Building2, ShieldCheck, ArrowRight, Crown, Ban, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminStats {
  totalUsers: number;
  physioUsers: number;
  researchUsers: number;
  totalAssessments: number;
  totalOrganisations: number;
  adminUsers: number;
  ownerUsers: number;
  suspendedUsers: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = httpsCallable<object, AdminStats>(firebaseFunctions, "adminGetStats");
    fn({})
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message ?? "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        {
          label: "Total Users",
          value: stats.totalUsers,
          sub: `${stats.physioUsers} physio · ${stats.researchUsers} research`,
          Icon: Users,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          href: "/admin/users",
        },
        {
          label: "Assessments",
          value: stats.totalAssessments,
          sub: "All tools combined",
          Icon: ClipboardList,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          href: "/admin/assessments",
        },
        {
          label: "Organisations",
          value: stats.totalOrganisations,
          sub: "Research orgs",
          Icon: Building2,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          href: "/admin/organisations",
        },
        {
          label: "Admins",
          value: stats.adminUsers,
          sub: `${stats.ownerUsers} owner${stats.ownerUsers !== 1 ? "s" : ""}`,
          Icon: ShieldCheck,
          color: "text-violet-400",
          bg: "bg-violet-500/10",
          border: "border-violet-500/20",
          href: "/admin/users",
        },
        {
          label: "Suspended",
          value: stats.suspendedUsers,
          sub: "Disabled accounts",
          Icon: Ban,
          color: "text-orange-400",
          bg: "bg-orange-500/10",
          border: "border-orange-500/20",
          href: "/admin/users",
        },
        {
          label: "Owners",
          value: stats.ownerUsers,
          sub: "Super admins",
          Icon: Crown,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          href: "/admin/settings",
        },
      ]
    : [];

  const quickLinks = [
    { label: "Manage Users", desc: "View, suspend, delete, and manage all user accounts", href: "/admin/users", color: "text-blue-400", border: "border-blue-500/20", bg: "hover:bg-blue-500/5" },
    { label: "View Assessments", desc: "Browse and delete assessments across all physiotherapists", href: "/admin/assessments", color: "text-emerald-400", border: "border-emerald-500/20", bg: "hover:bg-emerald-500/5" },
    { label: "View Organisations", desc: "Manage research organisations, status, and plans", href: "/admin/organisations", color: "text-amber-400", border: "border-amber-500/20", bg: "hover:bg-amber-500/5" },
    { label: "Audit Logs", desc: "Track all admin actions for accountability and compliance", href: "/admin/audit-logs", color: "text-indigo-400", border: "border-indigo-500/20", bg: "hover:bg-indigo-500/5" },
    { label: "System Settings", desc: "Manage owner access and view privilege overview", href: "/admin/settings", color: "text-slate-400", border: "border-slate-500/20", bg: "hover:bg-slate-500/5" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
          </div>
          <h1 className="text-2xl font-black text-text">Admin Dashboard</h1>
        </div>
        <p className="text-sm text-text-muted">System-wide overview of all users, assessments, and organisations.</p>
      </div>

      {/* Stats */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ label, value, sub, Icon, color, bg, border, href }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className={`text-left p-5 rounded-2xl border ${bg} ${border} hover:scale-[1.02] transition-transform`}
            >
              <div className={`w-9 h-9 rounded-xl ${bg} ${border} border flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-sm font-bold text-text mt-0.5">{label}</p>
              <p className="text-[11px] text-text-muted mt-1">{sub}</p>
            </button>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">Quick Actions</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map(({ label, desc, href, color, border, bg }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className={`text-left p-5 rounded-2xl bg-surface border ${border} ${bg} transition-colors group`}
            >
              <p className={`text-sm font-bold ${color} mb-1`}>{label}</p>
              <p className="text-[12px] text-text-muted mb-3">{desc}</p>
              <ArrowRight className={`w-4 h-4 ${color} group-hover:translate-x-1 transition-transform`} />
            </button>
          ))}
        </div>
      </div>

      {/* Access Tier Info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <p className="font-bold text-violet-400 text-sm">Admin Capabilities</p>
          </div>
          <ul className="space-y-1.5 text-[12px] text-text-muted">
            {["View all users, assessments, organisations", "Suspend / reactivate user accounts", "Send password reset links", "Delete individual assessments", "Edit organisation status and plan", "View full audit log trail"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-violet-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-400" />
            <p className="font-bold text-amber-400 text-sm">Owner-Only Capabilities</p>
          </div>
          <ul className="space-y-1.5 text-[12px] text-text-muted">
            {["All admin capabilities", "Permanently delete user accounts", "Delete research organisations", "Grant or revoke admin access", "Grant or revoke owner access", "Access system settings"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Nav hint */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border">
        <ScrollText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <p className="text-[12px] text-text-muted">
          All admin actions (deletes, suspends, role changes) are recorded in{" "}
          <button onClick={() => navigate("/admin/audit-logs")} className="text-indigo-400 font-bold hover:underline">Audit Logs</button>
          {" "}for traceability.
        </p>
      </div>
    </div>
  );
}
