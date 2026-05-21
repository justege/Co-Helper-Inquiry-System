import { useEffect, useState } from "react";
import { getMe, updateMe, type User } from "../api/users";

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    getMe()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateMe({ username });
      setProfile(updated);
      setUsername("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Profile</h1>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2>Edit Profile</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <dl>
              <dt>Current username</dt>
              <dd>{profile?.username ?? "—"}</dd>
            </dl>
            <label style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.875rem", color: "var(--color-muted)" }}>
              New username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter new username"
              />
            </label>
            <button
              style={{ marginTop: "1rem", width: "auto" }}
              onClick={handleSave}
              disabled={!username || saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
