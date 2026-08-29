import { useEffect, useState } from "react";
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
} from "react-router-dom";

import {
  getAdminSession,
  signOutAdmin,
} from "../adminAuth";

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

const APPLICATIONS_STORAGE_KEY =
  "cargo-track-admin-business-applications-v1";

const SPONSORED_STORAGE_KEY =
  "cargo-track-admin-sponsored-listings-v1";

function countPending(storageKey: string, fallback: number) {
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) return fallback;

    const items = JSON.parse(raw);

    if (!Array.isArray(items)) return fallback;

    return items.filter((item) => item?.status === "Pending").length;
  } catch {
    return fallback;
  }
}

function readBadgeCounts() {
  return {
    applications: countPending(APPLICATIONS_STORAGE_KEY, 1),
    sponsored: countPending(SPONSORED_STORAGE_KEY, 1),
  };
}

export default function AdminLayout() {
  const admin = getAdminSession();
  const [badgeCounts, setBadgeCounts] = useState(readBadgeCounts);

  useEffect(() => {
    const refreshBadgeCounts = () => {
      const next = readBadgeCounts();

      setBadgeCounts((current) =>
        current.applications === next.applications &&
        current.sponsored === next.sponsored
          ? current
          : next
      );
    };

    refreshBadgeCounts();

    window.addEventListener("storage", refreshBadgeCounts);
    window.addEventListener("focus", refreshBadgeCounts);

    const intervalId = window.setInterval(refreshBadgeCounts, 1000);

    return () => {
      window.removeEventListener("storage", refreshBadgeCounts);
      window.removeEventListener("focus", refreshBadgeCounts);
      window.clearInterval(intervalId);
    };
  }, []);

  const adminName =
    admin?.name || "Administrator";
  const adminRole =
    admin?.role || "System Administrator";

  const handleLogout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out of the Admin Portal?"
    );

    if (!confirmed) {
      return;
    }

    signOutAdmin();
    window.location.replace("/login");
  };

  const showNotificationsNotice = () => {
    window.alert(
      "Admin notifications will be added in a later prototype update."
    );
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar" style={{ zIndex: 1100 }}>
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

        <div className="sidebar-label">MENU</div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `nav-item ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>

                {item.label === "Applications" &&
                  badgeCounts.applications > 0 && (
                    <span className="nav-badge">
                      {badgeCounts.applications}
                    </span>
                  )}

                {item.label ===
                  "Sponsored Listings" &&
                  badgeCounts.sponsored > 0 && (
                    <span className="nav-badge">
                      {badgeCounts.sponsored}
                    </span>
                  )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-mini-profile">
            <div className="admin-mini-avatar">AD</div>

            <div>
              <strong>{adminName}</strong>
              <span>{adminRole}</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="top-search">
            <Search size={18} />
            <input
              placeholder="Search Cargo Track PH..."
              aria-label="Search Cargo Track PH"
            />
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="notification-button"
              onClick={showNotificationsNotice}
              aria-label="Admin notifications"
            >
              <Bell size={20} />
              <span className="notification-dot" />
            </button>

            <div className="top-admin">
              <div className="top-admin-avatar">AD</div>

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
