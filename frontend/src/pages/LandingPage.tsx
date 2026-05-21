import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <span className="landing-logo">Boilerplate</span>
        <div className="landing-header-actions">
          <Link to="/login" className="btn-outline">Sign In</Link>
          <Link to="/register" className="btn-primary">Get Started</Link>
        </div>
      </header>

      <section className="landing-hero">
        <h1>
          React · Node.js · Express
          <br />
          <span className="hero-accent">ready to ship.</span>
        </h1>
        <p className="hero-sub">
          Firebase auth, Supabase PostgreSQL, REST API — wired up and
          working out of the box.
        </p>
        <Link to="/register" className="btn-primary btn-lg">
          Start building
        </Link>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card">
            <span className="feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: "⚡",
    title: "REST API",
    desc: "Express serving a clean REST API with Firebase token verification on every request.",
  },
  {
    icon: "🔐",
    title: "Firebase Auth",
    desc: "Email/password and Google sign-in. ID tokens verified server-side on every request.",
  },
  {
    icon: "🗄️",
    title: "Supabase PostgreSQL",
    desc: "Managed Postgres with SSL. Tables are auto-created on first boot.",
  },
  {
    icon: "🚀",
    title: "Instant dev",
    desc: "One command boots both servers simultaneously.",
  },
];
