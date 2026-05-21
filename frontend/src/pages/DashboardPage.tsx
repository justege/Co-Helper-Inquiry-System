import { useEffect, useState } from "react";
import { useAuthContext } from "../components/auth/AuthContext";
import { getMe, type User } from "../api/users";

export default function DashboardPage() {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setProfile)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>

      <div className="card-grid">
        <div className="card">
          <h2>Firebase Identity</h2>
          <dl>
            <dt>Email</dt><dd>{user?.email}</dd>
            <dt>UID</dt><dd className="mono">{user?.uid}</dd>
            <dt>Provider</dt><dd>{user?.providerData[0]?.providerId}</dd>
          </dl>
        </div>

        <div className="card">
          <h2>Profile <span className="badge">REST</span></h2>
          {loading && <p className="muted">Loading from API…</p>}
          {error && (
            <p className="error">
              API error: {error}
              <br />
              <small>Is the backend running on port 8000?</small>
            </p>
          )}
          {profile && (
            <dl>
              <dt>ID</dt><dd className="mono">{profile.id}</dd>
              <dt>Username</dt><dd>{profile.username ?? "—"}</dd>
              <dt>Email</dt><dd>{profile.email}</dd>
              <dt>Member since</dt>
              <dd>{new Date(profile.createdAt).toLocaleDateString()}</dd>
            </dl>
          )}
          {!loading && !error && !profile && (
            <p className="muted">No profile returned — make sure .env is configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
