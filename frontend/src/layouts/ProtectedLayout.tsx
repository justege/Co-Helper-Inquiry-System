import { Navigate, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "../components/auth/AuthContext";

/**
 * Wraps all authenticated routes.
 * Shows the app shell (sidebar nav + top bar) and redirects to /login if not authenticated.
 */
export default function ProtectedLayout() {
  const { user, loading, logout } = useAuthContext();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex-center h-screen">
        <span className="loader" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">Boilerplate</div>

        <nav className="sidebar-nav">
          <NavLink to="/app/dashboard" className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/app/profile" className={navClass}>
            Profile
          </NavLink>
          <NavLink to="/app/settings" className={navClass}>
            Settings
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-email">{user.email}</span>
          <button className="btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "nav-link nav-link--active" : "nav-link";
}
