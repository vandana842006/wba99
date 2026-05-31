import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Building2,
  LogOut,
  Menu,
  ShieldCheck,
  X,
  ScrollText,
  Settings,
  Crown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { clsx } from "clsx";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isOwner = user?.isOwner === true;

  const navItems = [
    { label: "Dashboard", to: "/admin/dashboard", Icon: LayoutDashboard },
    { label: "Users", to: "/admin/users", Icon: Users },
    { label: "Assessments", to: "/admin/assessments", Icon: ClipboardList },
    { label: "Organisations", to: "/admin/organisations", Icon: Building2 },
    { label: "Audit Logs", to: "/admin/audit-logs", Icon: ScrollText },
    { label: "Settings", to: "/admin/settings", Icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const backHref =
    user?.role === "research" ? "/research/org-dashboard" : "/physio/dashboard";

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1">
          <span className="text-lg font-black text-text tracking-tight">WBA99</span>
          <p className="text-[9px] text-violet-400 font-bold uppercase tracking-widest">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150",
                isActive
                  ? "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                  : "text-text-muted hover:text-text hover:bg-text/5"
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        <div className="pt-3 border-t border-border mt-3">
          <NavLink
            to={backHref}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-text-muted hover:text-text hover:bg-text/5 transition-all duration-150"
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            Back to App
          </NavLink>
        </div>
      </nav>

      {/* Access badge */}
      <div className={`mx-4 mb-4 p-3 rounded-xl border ${isOwner ? "bg-amber-500/10 border-amber-500/20" : "bg-violet-500/10 border-violet-500/20"}`}>
        <div className="flex items-center gap-1.5">
          {isOwner
            ? <Crown className="w-3.5 h-3.5 text-amber-400" />
            : <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />}
          <p className={`text-[10px] font-bold uppercase tracking-wider ${isOwner ? "text-amber-400" : "text-violet-400"}`}>
            {isOwner ? "Owner Access" : "Admin Access"}
          </p>
        </div>
        <p className="text-[10px] text-text-muted mt-0.5">
          {isOwner ? "Full system control." : "Full control over all data."}
        </p>
      </div>

      {/* User */}
      <div className="px-4 py-5 border-t border-border space-y-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Appearance</span>
          <ThemeToggle className="scale-75 origin-right" />
        </div>
        <div className="flex items-center gap-3 px-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isOwner ? "bg-amber-500/20" : "bg-violet-500/20"}`}>
            <span className={`text-sm font-bold ${isOwner ? "text-amber-400" : "text-violet-400"}`}>
              {user?.name?.charAt(0).toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text truncate">{user?.name ?? "Admin"}</p>
            <p className={`text-[10px] uppercase tracking-wider font-bold ${isOwner ? "text-amber-400" : "text-violet-400"}`}>
              {isOwner ? "Owner" : "Administrator"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-text-muted hover:text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  const mobileNavItems = navItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-text font-['Inter']">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col bg-surface border-r border-border w-64 min-h-screen fixed top-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Admin navigation menu"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute top-0 left-0 h-full w-72 bg-surface border-r border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile Topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 -ml-1 rounded-xl text-text-muted hover:text-text hover:bg-text/10 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {isOwner ? <Crown className="w-5 h-5 text-amber-400" /> : <ShieldCheck className="w-5 h-5 text-violet-400" />}
            <span className="font-black text-text tracking-tight">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="scale-[0.6] origin-right" />
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isOwner ? "bg-amber-500/20" : "bg-violet-500/20"}`}>
              <span className={`text-sm font-bold ${isOwner ? "text-amber-400" : "text-violet-400"}`}>
                {user?.name?.charAt(0).toUpperCase() ?? "A"}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface/90 backdrop-blur-md border-t border-border flex items-center">
        {mobileNavItems.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors",
                isActive ? "text-violet-400" : "text-text-muted hover:text-text"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx("w-5 h-5", isActive && "drop-shadow-[0_0_6px_#8b5cf6]")} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
