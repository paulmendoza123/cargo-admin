import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  updateAdminPassword,
} from "../adminAuth";
import {
  useAdminAuth,
} from "../contexts/AdminAuthContext";

function isStrongAdminPassword(
  password: string
) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

export default function AdminResetPassword() {
  const {
    admin,
    loading,
    signOut,
  } = useAdminAuth();

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [complete, setComplete] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!isStrongAdminPassword(password)) {
      setError(
        "Use at least 12 characters with uppercase, lowercase, and a number."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateAdminPassword(password);
      setComplete(true);

      try {
        await signOut();
      } catch (signOutError) {
        console.error(
          "Password updated, but local sign-out failed:",
          signOutError
        );
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update the administrator password."
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
            SECURE RECOVERY
          </div>

          <h1>
            Protect administrator access.
          </h1>

          <p>
            Password recovery is completed through a
            time-limited Supabase Auth session and is
            available only to active administrator accounts.
          </p>
        </div>

        <div className="admin-login-brand-footer">
          Cargo Track PH administration environment
        </div>
      </section>

      <section className="admin-login-form-panel">
        <div className="admin-login-card">
          <div className="admin-login-icon">
            {complete ? (
              <CheckCircle2 size={25} />
            ) : (
              <KeyRound size={25} />
            )}
          </div>

          <div className="admin-login-eyebrow">
            PASSWORD RECOVERY
          </div>

          {complete ? (
            <>
              <h2>Password updated</h2>
              <p className="admin-login-description">
                Your administrator password was changed.
                Sign in again using the new password.
              </p>

              <div className="admin-login-success">
                <CheckCircle2 size={17} />
                <span>
                  The recovery session has been signed out.
                </span>
              </div>

              <Link
                to="/login"
                className="admin-login-submit"
              >
                <ShieldCheck size={18} />
                Return to Admin Login
              </Link>
            </>
          ) : loading ? (
            <>
              <h2>Checking recovery link</h2>
              <p className="admin-login-description">
                Verifying the secure password recovery session...
              </p>
            </>
          ) : !admin ? (
            <>
              <h2>Recovery link unavailable</h2>
              <p className="admin-login-description">
                This link is invalid, expired, or does not belong
                to an active administrator account. Request a new
                link from the Admin Login page.
              </p>

              <div className="admin-login-error">
                <AlertCircle size={17} />
                <span>No authorized recovery session was found.</span>
              </div>

              <Link
                to="/login"
                className="admin-login-secondary"
              >
                <ArrowLeft size={16} />
                Return to Admin Login
              </Link>
            </>
          ) : (
            <>
              <h2>Create a new password</h2>
              <p className="admin-login-description">
                Use a unique password with at least 12 characters.
              </p>

              <form onSubmit={handleSubmit}>
                <label
                  className="admin-login-label"
                  htmlFor="new-admin-password"
                >
                  New password
                </label>

                <div className="admin-login-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    id="new-admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="new-password"
                    placeholder="Enter a strong password"
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
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? "Hide passwords"
                        : "Show passwords"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <label
                  className="admin-login-label"
                  htmlFor="confirm-admin-password"
                >
                  Confirm password
                </label>

                <div className="admin-login-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    id="confirm-admin-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    autoComplete="new-password"
                    placeholder="Enter the password again"
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError("");
                    }}
                  />
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
                  <KeyRound size={18} />
                  {isSubmitting
                    ? "Updating password..."
                    : "Update Admin Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
