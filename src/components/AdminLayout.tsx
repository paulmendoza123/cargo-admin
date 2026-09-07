import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Bell,
  BriefcaseBusiness,
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
  loadAdminSponsorshipRequests,
} from "../lib/sponsorships";

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

  const [pendingSponsorships, setPendingSponsorships] =
    useState(0);

  const refreshPendingSponsorships =
    useCallback(async () => {
      try {
        const requests =
          await loadAdminSponsorshipRequests();

        setPendingSponsorships(
          requests.filter(
            (request) =>
              request.status === "Pending"
          ).length
        );
      } catch {
        setPendingSponsorships(0);
      }
    }, []);

  useEffect(() => {
    const handleChange = () => {
      void refreshPendingSponsorships();
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
        "focus",
        handleChange
      );
    };
  }, [refreshPendingSponsorships]);

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

  const showNotificationsNotice = () => {
    window.alert(
      "Admin notifications will be added in a later update."
    );
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
                  "Applications" && (
                  <span className="nav-badge">
                    3
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
            <button
              type="button"
              className="notification-button"
              onClick={
                showNotificationsNotice
              }
              aria-label="Admin notifications"
            >
              <Bell size={20} />
              <span className="notification-dot" />
            </button>

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
