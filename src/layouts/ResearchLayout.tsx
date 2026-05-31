import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, FlaskConical, Building2, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { clsx } from "clsx";

const navItems = [
  { label: "Org Dashboard", to: "/research/org-dashboard", Icon: Building2 },
  { label: "Data Explorer", to: "/research/dashboard", Icon: LayoutDashboard },
];

export function ResearchLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={clsx(
        "flex flex-col bg-surface border-r border-border",
        mobile ? "w-72 h-full" : "hidden lg:flex w-64 min-h-screen fixed top-0 left-0 z-30"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1">
          <span className="text-lg font-black text-text tracking-tight">WBA99</span>
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Research Suite</p>
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
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                  : "text-text-muted hover:text-text hover:bg-text/5"
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
        {user?.isAdmin && (
          <NavLink
            to="/admin/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 mt-2",
                isActive
                  ? "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                  : "text-violet-400/70 hover:text-violet-400 hover:bg-violet-500/10"
              )
            }
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            Admin Panel
          </NavLink>
        )}
      </nav>

      {/* Read-only notice */}
      <div className="mx-4 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Read-only access</p>
        <p className="text-[10px] text-text-muted mt-0.5">Data is anonymized per research protocols.</p>
      </div>

      {/* User */}
      <div className="px-4 py-5 border-t border-border space-y-4">
        <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Appearance</span>
            <ThemeToggle className="scale-75 origin-right" />
        </div>
        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-cyan-400">
              {user?.name?.charAt(0).toUpperCase() ?? "R"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text truncate">{user?.name ?? "Researcher"}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Researcher</p>
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
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-text font-['Inter']">
      <Sidebar />

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute top-0 left-0 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-border bg-surface sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-text/10 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            <span className="font-black text-text tracking-tight">WBA99 Research</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="scale-[0.6] origin-right" />
            <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <span className="text-sm font-bold text-cyan-400">
                {user?.name?.charAt(0).toUpperCase() ?? "R"}
                </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
