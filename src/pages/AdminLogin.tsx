import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  isAdminAuthenticated,
  signInAdmin,
  validateDemoAdmin,
} from "../adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [error, setError] = useState("");

  if (isAdminAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError(
        "Enter the admin email and password."
      );
      return;
    }

    if (
      !validateDemoAdmin(email, password)
    ) {
      setError(
        "The email or password is incorrect. Use the prototype credentials shown below."
      );
      return;
    }

    signInAdmin();
    navigate("/", { replace: true });
  };

  const fillDemoCredentials = () => {
    setEmail(DEMO_ADMIN_EMAIL);
    setPassword(DEMO_ADMIN_PASSWORD);
    setError("");
  };

  return (
    <div className="admin-login-page">
      <section className="admin-login-brand-panel">
        <div className="admin-login-brand-content">
          <img
            src="/cargo.png"
            alt="Cargo Track PH"
            className="admin-login-logo"
          />

          <div className="admin-login-portal-badge">
            <ShieldCheck size={16} />
            ADMIN PORTAL
          </div>

          <h1>
            Manage Cargo Track PH with confidence.
          </h1>

          <p>
            Review cargo business applications,
            manage users and companies, and verify
            sponsored placement requests from one
            secure workspace.
          </p>

          <div className="admin-login-feature-list">
            <div>
              <CheckCircle2 size={17} />
              Business application review
            </div>

            <div>
              <CheckCircle2 size={17} />
              User and company management
            </div>

            <div>
              <CheckCircle2 size={17} />
              Sponsored payment verification
            </div>
          </div>
        </div>

        <div className="admin-login-brand-footer">
          Prototype administration environment
        </div>
      </section>

      <section className="admin-login-form-panel">
        <div className="admin-login-card">
          <div className="admin-login-icon">
            <LockKeyhole size={25} />
          </div>

          <div className="admin-login-eyebrow">
            AUTHORIZED ACCESS
          </div>

          <h2>Welcome back, Admin</h2>

          <p className="admin-login-description">
            Sign in to continue to the Cargo Track PH
            administration dashboard.
          </p>

          <form onSubmit={handleSubmit}>
            <label
              className="admin-login-label"
              htmlFor="admin-email"
            >
              Email address
            </label>

            <div className="admin-login-input-wrap">
              <Mail size={18} />

              <input
                id="admin-email"
                type="email"
                value={email}
                autoComplete="username"
                placeholder="Enter admin email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
              />
            </div>

            <label
              className="admin-login-label"
              htmlFor="admin-password"
            >
              Password
            </label>

            <div className="admin-login-input-wrap">
              <LockKeyhole size={18} />

              <input
                id="admin-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                autoComplete="current-password"
                placeholder="Enter admin password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                className="admin-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {error && (
              <div className="admin-login-error">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="admin-login-submit"
            >
              <ShieldCheck size={19} />
              Sign In to Admin Portal
            </button>
          </form>

          <div className="admin-demo-credentials">
            <div>
              <strong>Prototype credentials</strong>
              <span>
                Use these details for the admin demo.
              </span>
            </div>

            <div className="admin-demo-row">
              <span>Email</span>
              <code>{DEMO_ADMIN_EMAIL}</code>
            </div>

            <div className="admin-demo-row">
              <span>Password</span>
              <code>{DEMO_ADMIN_PASSWORD}</code>
            </div>

            <button
              type="button"
              className="admin-fill-demo-button"
              onClick={fillDemoCredentials}
            >
              Fill Demo Credentials
            </button>
          </div>

          <div className="admin-login-note">
            Prototype only: authentication is stored
            locally in this browser. Supabase Auth will
            replace it during backend integration.
          </div>
        </div>
      </section>
    </div>
  );
}
