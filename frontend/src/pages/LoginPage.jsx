import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";
import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forcePrompt, setForcePrompt] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const attemptLogin = async ({ force = false } = {}) => {
    setError("");
    setForcePrompt(null);
    setLoading(true);
    try {
      const result = await authApi.login({ ...form, force });
      login(result.access_token, result.user);
      navigate("/dashboard");
    } catch (apiError) {
      const detail = apiError.payload?.detail;
      if (detail?.code === "active_session") {
        setError(detail.message || apiError.message || "Account already active elsewhere");
        setForcePrompt({
          message: detail.message,
          expiresAt: detail.active_session?.expires_at
        });
      } else {
        setError(apiError.message || "Unable to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    attemptLogin();
  };

  const handleForceLogin = () => attemptLogin({ force: true });

  const describeExpiry = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__copy">
          <p className="eyebrow">T&T TRANSPORT & FORWARDING</p>
          <h1>FREIGHT MANAGEMENT </h1>
          <p className="lede">
            Log in to manage shipments with real-time visibility.
          </p>
        </div>
        {error && <p className="error-callout">{error}</p>}
        {forcePrompt && (
          <div className="force-callout">
            <div>
              <p className="force-callout__label">Active session detected.</p>
              {forcePrompt.message && <p className="force-callout__message">{forcePrompt.message}</p>}
              {describeExpiry(forcePrompt.expiresAt) && (
                <p className="force-callout__meta">Current session expires {describeExpiry(forcePrompt.expiresAt)}</p>
              )}
            </div>
            <button type="button" className="force-callout__action" onClick={handleForceLogin} disabled={loading}>
              {loading ? "Taking over..." : "Take over session"}
            </button>
          </div>
        )}
        <form className="auth-form" autoComplete="on" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </label>
          <div className="auth-form__meta">
            <p className="muted-link password-hint">Tip: click "Save password".</p>
            <Link to="/forgot-password" className="muted-link">Forgot access?</Link>
          </div>
          <button type="submit" className="btn primary full" disabled={loading}>
            {loading ? "Checking..." : "Login"}
          </button>
        </form>
      </section>
      <div className="auth-hero">
        <div className="auth-hero__badge">land · SEA . AIR</div>
        <div className="auth-hero__panel">
          <p>PROTOTYPE VERSION</p>
          <small>Next update coming soon</small>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
