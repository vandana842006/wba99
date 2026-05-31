import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  allowedRole: UserRole;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Loading…</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { user, loading, error } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (error || !user) return <Navigate to="/login" replace />;

  if (user.role !== allowedRole) {
    if (user.role === "physio") return <Navigate to="/physio/dashboard" replace />;
    if (user.role === "research") return <Navigate to="/research/org-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading, error } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (error || !user) return <Navigate to="/login" replace />;

  if (!user.isAdmin) {
    if (user.role === "physio") return <Navigate to="/physio/dashboard" replace />;
    if (user.role === "research") return <Navigate to="/research/org-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
