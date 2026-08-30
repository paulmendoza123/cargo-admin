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
  useAdminAuth,
} from "../contexts/AdminAuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();

  const {
    admin,
    loading,
    signIn,
  } = useAdminAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#123b5d",
          fontWeight: 700,
        }}
      >
        Checking administrator access...
      </div>
    );
  }

  if (admin) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (
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

    try {
      setIsSubmitting(true);

      await signIn(email, password);

      navigate("/", {
        replace: true,
      });
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
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
            Manage Cargo Track PH with
            confidence.
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
          Secure administration environment
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                className="admin-password-toggle"
                disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              <ShieldCheck size={19} />

              {isSubmitting
                ? "Signing in..."
                : "Sign In to Admin Portal"}
            </button>
          </form>

          <div className="admin-demo-credentials">
            <div>
              <strong>
                Secure administrator access
              </strong>

              <span>
                Only verified and active admin
                accounts can access this portal.
              </span>
            </div>

            <div className="admin-demo-row">
              <span>Authentication</span>
              <code>Supabase Auth</code>
            </div>

            <div className="admin-demo-row">
              <span>Access level</span>
              <code>Administrator only</code>
            </div>
          </div>

          <div className="admin-login-note">
            Authentication and sessions are securely
            managed through Supabase.
          </div>
        </div>
      </section>
    </div>
  );
}