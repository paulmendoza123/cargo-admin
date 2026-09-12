import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  useAdminAuth,
} from "../contexts/AdminAuthContext";
import {
  requestAdminPasswordReset,
} from "../adminAuth";

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

  const [recoveryMode, setRecoveryMode] =
    useState(false);

  const [recoverySent, setRecoverySent] =
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

  const handlePasswordRecovery = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(
        "Enter the administrator email address."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await requestAdminPasswordReset(email);
      setRecoverySent(true);
    } catch (recoveryError) {
      setError(
        recoveryError instanceof Error
          ? recoveryError.message
          : "Unable to send the password reset email."
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
            premium placement requests from one
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
              Premium Listing payment verification
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
            {recoveryMode
              ? "ACCOUNT RECOVERY"
              : "AUTHORIZED ACCESS"}
          </div>

          <h2>
            {recoveryMode
              ? "Reset admin password"
              : "Welcome back, Admin"}
          </h2>

          <p className="admin-login-description">
            {recoveryMode
              ? "Enter the administrator email address and we’ll send a secure password reset link."
              : "Sign in to continue to the Cargo Track PH administration dashboard."}
          </p>

          {recoveryMode ? (
            <form onSubmit={handlePasswordRecovery}>
              <label
                className="admin-login-label"
                htmlFor="recovery-email"
              >
                Administrator email
              </label>

              <div className="admin-login-input-wrap">
                <Mail size={18} />

                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="Enter admin email"
                  disabled={isSubmitting || recoverySent}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                    setRecoverySent(false);
                  }}
                />
              </div>

              {error && (
                <div className="admin-login-error">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              {recoverySent && (
                <div className="admin-login-success">
                  <CheckCircle2 size={17} />
                  <span>
                    If this email belongs to an account,
                    a password reset link has been sent.
                  </span>
                </div>
              )}

              {!recoverySent && (
                <button
                  type="submit"
                  className="admin-login-submit"
                  disabled={isSubmitting}
                >
                  <Send size={18} />
                  {isSubmitting
                    ? "Sending link..."
                    : "Send Reset Link"}
                </button>
              )}

              <button
                type="button"
                className="admin-login-secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setRecoveryMode(false);
                  setRecoverySent(false);
                  setError("");
                }}
              >
                <ArrowLeft size={16} />
                Back to admin login
              </button>
            </form>
          ) : (
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

            <div className="admin-login-actions">
              <button
                type="button"
                className="admin-login-link"
                disabled={isSubmitting}
                onClick={() => {
                  setRecoveryMode(true);
                  setRecoverySent(false);
                  setError("");
                }}
              >
                Forgot password?
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
          )}

        </div>
      </section>
    </div>
  );
}
