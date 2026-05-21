import { firebaseConfigured } from "../../lib/firebase";

export function SetupBanner() {
  if (firebaseConfigured) return null;

  return (
    <div className="setup-banner">
      <strong>Setup required</strong>
      <ul>
        <li>
          <span className="setup-label">Firebase credentials</span>
          <span className="setup-hint">
            Copy frontend/.env.example → frontend/.env and fill in VITE_FIREBASE_* values
          </span>
        </li>
      </ul>
    </div>
  );
}
