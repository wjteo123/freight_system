import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";
import "./RegisterPage.css";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" }
];

function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    role: "staff",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords must match");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        username: form.username,
        password: form.password,
        role: form.role,
        name: form.name,
        email: form.email
      });
      setSuccess("Operator created successfully. Redirecting to login...");
      setTimeout(() => navigate("/"), 1200);
    } catch (apiError) {
      setError(apiError.message || "Unable to create operator");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-shell">
      <div className="register-content">
        <p className="eyebrow">Onboard new user</p>
        <h1>Create Account Within Minutes.</h1>
        <p className="lede">
          Define a role, add regional contact data, and your teammate can co-manage shipments instantly.
        </p>
        {error && <p className="error-callout">{error}</p>}
        {success && <p className="success-callout">{success}</p>}
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              <span>Full name</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              <span>Username</span>
              <input name="username" value={form.username} onChange={handleChange}  required />
            </label>
          </div>
          <div className="form-row">
            <label>
              <span>Work email</span>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </label>
            <label>
              <span>Role</span>
              <select name="role" value={form.role} onChange={handleChange}>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              <span>Password</span>
              <input type="password" name="password" value={form.password} onChange={handleChange} required />
            </label>
            <label>
              <span>Confirm password</span>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required />
            </label>
          </div>
          <button className="btn primary full" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Register Account"}
          </button>
          <p className="muted-link">
            Already trusted? <Link to="/">Return to login</Link>
          </p>
        </form>
      </div>
      <div className="register-panel">
        <div className="register-panel__stat">
          <h3>Shipment throughput</h3>
          <p>1.2k consignments/month</p>
          <small>Operators sync in seconds</small>
        </div>
        <div className="register-panel__stat">
          <h3>Live visibility</h3>
          <p>Real-time status feeds</p>
          <small>Syncs with shipments module</small>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
