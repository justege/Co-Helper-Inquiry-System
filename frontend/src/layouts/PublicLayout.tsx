import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../components/auth/AuthContext";

/**
 * Wraps public-only routes (login, register, landing).
 * Redirect authenticated users away from login/register only — keep landing
 * accessible so the inquiry form can finish after Firebase signup.
 */
export default function PublicLayout() {
  const { user, loading } = useAuthContext();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="flex-center h-screen">
        <span className="loader" />
      </div>
    );
  }

  const authGateRoutes = ["/login", "/register", "/partner/login", "/partner/register"];
  if (user && authGateRoutes.includes(pathname)) {
    const partnerRoutes = ["/partner/login", "/partner/register"];
    const destination = partnerRoutes.includes(pathname)
      ? "/app/partner-services"
      : "/app/dashboard";
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
