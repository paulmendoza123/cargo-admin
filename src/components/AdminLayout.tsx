import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  Users,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  useAdminAuth,
} from "../contexts/AdminAuthContext";
import {
  loadAdminDashboard,
} from "../lib/dashboard";
import type {
  AdminDashboardSummary,
} from "../lib/dashboard";
import "./AdminLayout.css";

const navItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Applications",
    path: "/applications",
    icon: FileCheck2,
  },
  {
    label: "Businesses",
    path: "/businesses",
    icon: BriefcaseBusiness,
  },
  {
    label: "Sponsored Listings",
    path: "/sponsored",
    icon: Megaphone,
  },
  {
    label: "Users",
    path: "/users",
    icon: Users,
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const {
    admin,
    signOut,
  } = useAdminAuth();

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [dashboardSummary, setDashboardSummary] =
    useState<AdminDashboardSummary | null>(null);
  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const refreshDashboardSummary =
    useCallback(async () => {
      try {
        const dashboard = await loadAdminDashboard();
        setDashboardSummary(dashboard.summary);
      } catch {
        setDashboardSummary(null);
      }
    }, []);

  useEffect(() => {
    const handleChange = () => {
      void refreshDashboardSummary();
    };

    const handleDashboardLoaded = (event: Event) => {
      const customEvent = event as CustomEvent<AdminDashboardSummary>;
      setDashboardSummary(customEvent.detail);
    };

    const initialRefresh =
      window.setTimeout(
        handleChange,
        0
      );

    window.addEventListener(
      "cargo:sponsorships-changed",
      handleChange
    );
    window.addEventListener(
      "cargo:applications-changed",
      handleChange
    );
    window.addEventListener(
      "cargo:businesses-changed",
      handleChange
    );
    window.addEventListener(
      "cargo:users-changed",
      handleChange
    );
    window.addEventListener(
      "cargo:dashboard-loaded",
      handleDashboardLoaded
    );
    window.addEventListener(
      "focus",
      handleChange
    );

    return () => {
      window.clearTimeout(
        initialRefresh
      );
      window.removeEventListener(
        "cargo:sponsorships-changed",
        handleChange
      );
      window.removeEventListener(
        "cargo:applications-changed",
        handleChange
      );
      window.removeEventListener(
        "cargo:businesses-changed",
        handleChange
      );
      window.removeEventListener(
        "cargo:users-changed",
        handleChange
      );
      window.removeEventListener(
        "cargo:dashboard-loaded",
        handleDashboardLoaded
      );
      window.removeEventListener(
        "focus",
        handleChange
      );
    };
  }, [refreshDashboardSummary]);

  const pendingApplications =
    dashboardSummary?.pendingApplications ?? 0;
  const pendingSponsorships =
    dashboardSummary?.pendingSponsorships ?? 0;
  const pendingIdentityVerifications =
    dashboardSummary?.pendingIdentityVerifications ?? 0;
  const totalNotifications =
    pendingApplications +
    pendingSponsorships +
    pendingIdentityVerifications;

  const adminName =
    admin?.name || "Administrator";

  const adminRole =
    admin?.role ||
    "System Administrator";

  const handleLogout = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out of the Admin Portal?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsLoggingOut(true);

      await signOut();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again."
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const openNotificationTarget = (path: string) => {
    setNotificationsOpen(false);
    navigate(path);
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            src="/cargo.png"
            alt="Cargo Track PH"
            className="brand-logo"
          />

          <div className="brand-portal">
            Admin Portal
          </div>
        </div>

        <div className="sidebar-label">
          MENU
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({
                  isActive,
                }) =>
                  `nav-item ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <Icon size={20} />

                <span>{item.label}</span>

                {item.label ===
                  "Applications" &&
                  pendingApplications > 0 && (
                  <span className="nav-badge">
                    {pendingApplications}
                  </span>
                )}

                {item.label ===
                  "Sponsored Listings" &&
                  pendingSponsorships > 0 && (
                  <span className="nav-badge">
                    {pendingSponsorships}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-mini-profile">
            <div className="admin-mini-avatar">
              AD
            </div>

            <div>
              <strong>{adminName}</strong>
              <span>{adminRole}</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={18} />

            {isLoggingOut
              ? "Logging out..."
              : "Logout"}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="top-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search Cargo Track PH..."
              aria-label="Search Cargo Track PH"
            />
          </div>

          <div className="topbar-actions">
            <div className="admin-notification-wrap">
              <button
                type="button"
                className={
                  notificationsOpen
                    ? "notification-button active"
                    : "notification-button"
                }
                onClick={() =>
                  setNotificationsOpen((current) => !current)
                }
                aria-label="Admin notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell size={20} />
                {totalNotifications > 0 && (
                  <>
                    <span className="notification-dot" />
                    <span className="notification-count">
                      {totalNotifications > 99 ? "99+" : totalNotifications}
                    </span>
                  </>
                )}
              </button>

              {notificationsOpen && (
                <div className="admin-notification-menu">
                  <div className="admin-notification-header">
                    <div>
                      <strong>Needs attention</strong>
                      <span>Live administrator review queue</span>
                    </div>
                    <span>{totalNotifications}</span>
                  </div>

                  {totalNotifications === 0 ? (
                    <div className="admin-notification-empty">
                      <CheckCircle2 size={24} />
                      <strong>All caught up</strong>
                      <span>No pending administrator reviews.</span>
                    </div>
                  ) : (
                    <div className="admin-notification-list">
                      {pendingApplications > 0 && (
                        <NotificationItem
                          icon={<FileCheck2 size={18} />}
                          title="Business applications"
                          detail={`${pendingApplications} waiting for review`}
                          count={pendingApplications}
                          onClick={() => openNotificationTarget("/applications")}
                        />
                      )}
                      {pendingSponsorships > 0 && (
                        <NotificationItem
                          icon={<Megaphone size={18} />}
                          title="Sponsorship payments"
                          detail={`${pendingSponsorships} waiting for verification`}
                          count={pendingSponsorships}
                          onClick={() => openNotificationTarget("/sponsored")}
                        />
                      )}
                      {pendingIdentityVerifications > 0 && (
                        <NotificationItem
                          icon={<Users size={18} />}
                          title="Customer ID submissions"
                          detail={`${pendingIdentityVerifications} waiting for review`}
                          count={pendingIdentityVerifications}
                          onClick={() => openNotificationTarget("/users")}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="top-admin">
              <div className="top-admin-avatar">
                AD
              </div>

              <div>
                <strong>{adminName}</strong>
                <span>{adminRole}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NotificationItem({
  icon,
  title,
  detail,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="admin-notification-item"
      onClick={onClick}
    >
      <span className="admin-notification-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <b>{count}</b>
    </button>
  );
}
