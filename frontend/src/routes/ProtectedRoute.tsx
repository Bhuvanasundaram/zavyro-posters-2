import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>Checking account…</main>;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
