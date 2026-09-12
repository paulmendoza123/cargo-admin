import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  MapPin,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAdminAuth } from "../contexts/AdminAuthContext";
import { loadAdminDashboard } from "../lib/dashboard";
import type { AdminDashboardData } from "../lib/dashboard";
import "./Dashboard.css";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function Dashboard() {
  const { admin } = useAdminAuth();
  const [dashboard, setDashboard] =
    useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadDashboard = useCallback(async (quiet = false) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError("");

    try {
      const nextDashboard = await loadAdminDashboard();
      setDashboard(nextDashboard);
      window.dispatchEvent(
        new CustomEvent("cargo:dashboard-loaded", {
          detail: nextDashboard.summary,
        })
      );
    } catch (error) {
      console.error("Unable to load admin dashboard:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load the administrator dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    const refresh = () => {
      void loadDashboard(true);
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("cargo:applications-changed", refresh);
    window.addEventListener("cargo:businesses-changed", refresh);
    window.addEventListener("cargo:sponsorships-changed", refresh);
    window.addEventListener("cargo:users-changed", refresh);

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("cargo:applications-changed", refresh);
      window.removeEventListener("cargo:businesses-changed", refresh);
      window.removeEventListener("cargo:sponsorships-changed", refresh);
      window.removeEventListener("cargo:users-changed", refresh);
    };
  }, [loadDashboard]);

  const summary = dashboard?.summary;
  const pendingApplications = dashboard?.pendingApplications || [];
  const recentBusinesses = dashboard?.recentBusinesses || [];

  const stats = useMemo(
    () => [
      {
        title: "Total Businesses",
        value: summary?.totalBusinesses ?? 0,
        subtitle: `${summary?.suspendedBusinesses ?? 0} suspended`,
        icon: BriefcaseBusiness,
        className: "blue",
      },
      {
        title: "Pending Applications",
        value: summary?.pendingApplications ?? 0,
        subtitle: "Waiting for review",
        icon: Clock3,
        className: "yellow",
      },
      {
        title: "Active Businesses",
        value: summary?.activeBusinesses ?? 0,
        subtitle: `${summary?.totalBookings ?? 0} total bookings`,
        icon: CheckCircle2,
        className: "green",
      },
      {
        title: "Customer Accounts",
        value: summary?.customerAccounts ?? 0,
        subtitle: `${summary?.pendingIdentityVerifications ?? 0} ID reviews pending`,
        icon: Users,
        className: "purple",
      },
    ],
    [summary]
  );

  const today = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h2>Dashboard</h2>
          <p className="page-description">
            Monitor live Cargo Track PH businesses, applications, and users.
          </p>
        </div>

        <div className="dashboard-heading-actions">
          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "spin" : ""}
            />
            Refresh
          </button>
          <div className="date-card">
            <span>Today</span>
            <strong>{today}</strong>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="dashboard-error-banner">
          <AlertCircle size={19} />
          <div>
            <strong>Dashboard data could not be loaded.</strong>
            <span>{pageError}</span>
          </div>
          <button type="button" onClick={() => void loadDashboard()}>
            Try again
          </button>
        </div>
      )}

      <section className="welcome-card">
        <div className="welcome-content">
          <div className="welcome-icon">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="welcome-small">SYSTEM ADMINISTRATION</p>
            <h3>Welcome back, {admin?.name || "Administrator"}</h3>
            <p>
              Review pending work and monitor the live Cargo Track PH platform
              from one dashboard.
            </p>
          </div>
        </div>

        <div className={`system-online ${pageError ? "offline" : ""}`}>
          <span />
          {pageError ? "Connection needs attention" : "Live backend connected"}
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="stat-card" key={stat.title}>
              <div className={`stat-icon ${stat.className}`}>
                <Icon size={23} />
              </div>
              <div className="stat-value">
                {loading && !dashboard ? "—" : stat.value}
              </div>
              <h4>{stat.title}</h4>
              <p>{stat.subtitle}</p>
            </div>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">REQUIRES ATTENTION</p>
              <h3>Pending Applications</h3>
            </div>
            <Link to="/applications" className="view-all">
              View all
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Representative</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && !dashboard ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="dashboard-table-state">
                        <Loader2 size={17} className="spin" />
                        Loading applications...
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingApplications.slice(0, 3).map((application) => (
                    <tr key={application.id}>
                      <td>
                        <div className="company-cell">
                          <div className="table-icon yellow">
                            <FileCheck2 size={18} />
                          </div>
                          <div className="dashboard-company-copy">
                            <strong>{application.businessName}</strong>
                            <span>{application.applicationCode}</span>
                          </div>
                        </div>
                      </td>
                      <td>{application.representativeName}</td>
                      <td>{formatDate(application.submittedAt)}</td>
                      <td>
                        <span className="status pending">
                          <span />
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))
                )}

                {!loading && pendingApplications.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="dashboard-table-state success">
                        <CheckCircle2 size={18} />
                        No pending applications.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="quick-panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">SHORTCUTS</p>
              <h3>Quick Actions</h3>
            </div>
          </div>

          <QuickAction
            to="/applications"
            tone="yellow"
            icon={<FileCheck2 size={21} />}
            title="Review Applications"
            subtitle={`${summary?.pendingApplications ?? 0} waiting for review`}
          />
          <QuickAction
            to="/sponsored"
            tone="yellow"
            icon={<Megaphone size={21} />}
            title="Review Premium Listings"
            subtitle={`${summary?.pendingSponsorships ?? 0} payment reviews pending`}
          />
          <QuickAction
            to="/businesses"
            tone="blue"
            icon={<BriefcaseBusiness size={21} />}
            title="Manage Businesses"
            subtitle={`${summary?.activeBusinesses ?? 0} active companies`}
          />
          <QuickAction
            to="/users"
            tone="purple"
            icon={<Users size={21} />}
            title="Manage Users"
            subtitle={`${summary?.pendingIdentityVerifications ?? 0} ID reviews pending`}
          />
        </div>
      </section>

      <section className="panel businesses-panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">RECENTLY APPROVED</p>
            <h3>Registered Businesses</h3>
          </div>
          <Link to="/businesses" className="view-all">
            View all
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading && !dashboard ? (
          <div className="dashboard-business-state">
            <Loader2 size={19} className="spin" />
            Loading businesses...
          </div>
        ) : recentBusinesses.length === 0 ? (
          <div className="dashboard-business-state">
            No active businesses yet.
          </div>
        ) : (
          <div className="business-grid">
            {recentBusinesses.map((business) => (
              <div className="business-mini-card" key={business.id}>
                <div className="business-mini-icon">
                  {business.logoUrl ? (
                    <img src={business.logoUrl} alt={`${business.name} logo`} />
                  ) : (
                    <BriefcaseBusiness size={23} />
                  )}
                </div>
                <div className="business-mini-content">
                  <strong>{business.name}</strong>
                  <span className="dashboard-business-code">
                    {business.businessCode}
                  </span>
                  <span>
                    <MapPin size={13} />
                    {business.address}
                  </span>
                  <p>
                    {business.destinationsCount}{" "}
                    {business.destinationsCount === 1
                      ? "destination"
                      : "destinations"}{" "}
                    available
                  </p>
                </div>
                <span className="status active">
                  <span />
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function QuickAction({
  to,
  tone,
  icon,
  title,
  subtitle,
}: {
  to: string;
  tone: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link to={to} className="quick-action">
      <div className={`quick-action-icon ${tone}`}>{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <ArrowRight size={17} />
    </Link>
  );
}
