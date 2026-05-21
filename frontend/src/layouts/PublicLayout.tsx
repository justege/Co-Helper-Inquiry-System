import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../components/auth/AuthContext";

/**
 * Wraps public-only routes (login, register, landing).
 * If the user is already authenticated, redirect to the app.
 */
export default function PublicLayout() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex-center h-screen">
        <span className="loader" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
}
