import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../services/api";
import "./LoginPage.css";
import "./ForgotPasswordPage.css";

function ForgotPasswordPage() {
  const [form, setForm] = useState({ username: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword({
        username: form.username,
        new_password: form.newPassword
      });
      setSuccess(response?.detail || "Password updated. You can sign in now.");
      setForm({ username: "", newPassword: "", confirmPassword: "" });
    } catch (apiError) {
      setError(apiError.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__copy">
          <p className="eyebrow">Secure Reset</p>
          <h1>Recover Access</h1>
          <p className="lede">
            Confirm your username and set a brand-new password. The existing active session will stay intact
            until that user signs out.
          </p>
        </div>
        {error && <p className="error-callout">{error}</p>}
        {success && <p className="success-callout">{success}</p>}
        <form className="auth-form" autoComplete="on" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input
              name="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>New password</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Confirm new password</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </label>
          <ul className="reset-hints">
            <li>Minimum 8 characters, mix letters and numbers.</li>
            <li>Browsers can store this new password securely when prompted.</li>
          </ul>
          <button type="submit" className="btn primary full" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
        <p className="muted-link back-link">
          Remembered it? <Link to="/">Return to login</Link>
        </p>
      </section>
      <div className="auth-hero reset">
        <div className="auth-hero__badge">Security pulse</div>
        <div className="auth-hero__panel">
          <p>One session policy</p>
          <small>Only one active device per account at a time.</small>
          <div className="reset-steps">
            <div>
              <span className="step-index">01</span>
              <p>Enter username</p>
            </div>
            <div>
              <span className="step-index">02</span>
              <p>Set new password</p>
            </div>
            <div>
              <span className="step-index">03</span>
              <p>Save it in your browser vault</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
