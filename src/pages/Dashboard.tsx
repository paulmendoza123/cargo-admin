import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

type DashboardApplication = {
  id: string;
  businessName: string;
  representativeName: string;
  submittedAt: string;
  status: "Pending" | "Approved" | "Rejected";
};

type DashboardBusiness = {
  id: string;
  name: string;
  address: string;
  status: "Active" | "Suspended";
  approvedDate: string;
  destinations: string[];
};

type DashboardUser = {
  role?: string;
  type?: string;
  accountType?: string;
};

const APPLICATIONS_STORAGE_KEY =
  "cargo-track-admin-business-applications-v1";

const BUSINESSES_STORAGE_KEY =
  "cargo-track-admin-businesses-v1";

const USERS_STORAGE_KEY =
  "cargo-track-admin-users-v1";

const FALLBACK_APPLICATIONS: DashboardApplication[] = [
  {
    id: "APP-2026-0001",
    businessName: "Palawan Sky Cargo",
    representativeName: "Maria Santos",
    submittedAt: "2026-08-28T14:45:00.000Z",
    status: "Pending",
  },
  {
    id: "APP-2026-0002",
    businessName: "Puerto Freight Link",
    representativeName: "Carlo Reyes",
    submittedAt: "2026-08-27T09:30:00.000Z",
    status: "Approved",
  },
  {
    id: "APP-2026-0003",
    businessName: "Harbor Cargo Palawan",
    representativeName: "Ana Mendoza",
    submittedAt: "2026-08-26T08:15:00.000Z",
    status: "Rejected",
  },
];

const FALLBACK_BUSINESSES: DashboardBusiness[] = [
  {
    id: "BUS-001",
    name: "ABC Cargo Express",
    address: "Puerto Princesa City, Palawan",
    status: "Active",
    approvedDate: "Aug 10, 2026",
    destinations: ["Manila", "Cebu", "Davao"],
  },
  {
    id: "BUS-002",
    name: "XYZ Cargo Services",
    address: "Puerto Princesa City, Palawan",
    status: "Active",
    approvedDate: "Aug 8, 2026",
    destinations: ["Manila", "Cebu"],
  },
  {
    id: "BUS-003",
    name: "Palawan Cargo Lines",
    address: "Puerto Princesa City, Palawan",
    status: "Active",
    approvedDate: "Aug 5, 2026",
    destinations: ["Manila", "Davao"],
  },
  {
    id: "BUS-004",
    name: "Island Freight Palawan",
    address: "Puerto Princesa City, Palawan",
    status: "Suspended",
    approvedDate: "Jul 29, 2026",
    destinations: ["Cebu", "Davao"],
  },
];

function readStoredArray<T>(storageKey: string, fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function readCustomerCount() {
  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);

    if (!raw) return 48;

    const users = JSON.parse(raw) as DashboardUser[];

    if (!Array.isArray(users)) return 48;

    return users.filter((user) => {
      const accountType = (
        user.role ||
        user.type ||
        user.accountType ||
        ""
      ).toLowerCase();

      return accountType.includes("customer");
    }).length;
  } catch {
    return 48;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function Dashboard() {
  const applications = readStoredArray<DashboardApplication>(
    APPLICATIONS_STORAGE_KEY,
    FALLBACK_APPLICATIONS
  );

  const businesses = readStoredArray<DashboardBusiness>(
    BUSINESSES_STORAGE_KEY,
    FALLBACK_BUSINESSES
  );

  const pendingApplications = applications
    .filter((application) => application.status === "Pending")
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() -
        new Date(a.submittedAt).getTime()
    );

  const activeBusinesses = businesses.filter(
    (business) => business.status === "Active"
  );

  const recentBusinesses = [...activeBusinesses]
    .sort(
      (a, b) =>
        new Date(b.approvedDate).getTime() -
        new Date(a.approvedDate).getTime()
    )
    .slice(0, 3);

  const stats = [
    {
      title: "Total Businesses",
      value: businesses.length.toString(),
      subtitle: "Registered cargo companies",
      icon: BriefcaseBusiness,
      className: "blue",
    },
    {
      title: "Pending Applications",
      value: pendingApplications.length.toString(),
      subtitle: "Waiting for review",
      icon: Clock3,
      className: "yellow",
    },
    {
      title: "Active Businesses",
      value: activeBusinesses.length.toString(),
      subtitle: "Currently active",
      icon: CheckCircle2,
      className: "green",
    },
    {
      title: "Customer Accounts",
      value: readCustomerCount().toString(),
      subtitle: "Registered customers",
      icon: Users,
      className: "purple",
    },
  ];

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
            Monitor Cargo Track PH businesses, applications, and users.
          </p>
        </div>

        <div className="date-card">
          <span>Today</span>
          <strong>{today}</strong>
        </div>
      </div>

      <section className="welcome-card">
        <div className="welcome-content">
          <div className="welcome-icon">
            <ShieldCheck size={28} />
          </div>

          <div>
            <p className="welcome-small">SYSTEM ADMINISTRATION</p>
            <h3>Welcome back, Administrator</h3>
            <p>
              Review business applications and monitor the Cargo Track PH
              platform from one dashboard.
            </p>
          </div>
        </div>

        <div className="system-online">
          <span />
          Prototype System Active
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

              <div className="stat-value">{stat.value}</div>
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
                {pendingApplications.slice(0, 3).map((application) => (
                  <tr key={application.id}>
                    <td>
                      <div className="company-cell">
                        <div className="table-icon yellow">
                          <FileCheck2 size={18} />
                        </div>

                        <strong>{application.businessName}</strong>
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
                ))}

                {pendingApplications.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center" }}>
                      No pending applications.
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

          <Link to="/applications" className="quick-action">
            <div className="quick-action-icon yellow">
              <FileCheck2 size={21} />
            </div>

            <div>
              <strong>Review Applications</strong>
              <span>
                {pendingApplications.length}{" "}
                {pendingApplications.length === 1
                  ? "business waiting"
                  : "businesses waiting"}
              </span>
            </div>

            <ArrowRight size={17} />
          </Link>

          <Link to="/businesses" className="quick-action">
            <div className="quick-action-icon blue">
              <BriefcaseBusiness size={21} />
            </div>

            <div>
              <strong>Manage Businesses</strong>
              <span>View cargo companies</span>
            </div>

            <ArrowRight size={17} />
          </Link>

          <Link to="/users" className="quick-action">
            <div className="quick-action-icon purple">
              <Users size={21} />
            </div>

            <div>
              <strong>Manage Users</strong>
              <span>Customer &amp; business accounts</span>
            </div>

            <ArrowRight size={17} />
          </Link>
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

        <div className="business-grid">
          {recentBusinesses.map((business) => (
            <div className="business-mini-card" key={business.id}>
              <div className="business-mini-icon">
                <BriefcaseBusiness size={23} />
              </div>

              <div className="business-mini-content">
                <strong>{business.name}</strong>

                <span>
                  <MapPin size={13} />
                  {business.address}
                </span>

                <p>
                  {business.destinations.length}{" "}
                  {business.destinations.length === 1
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
      </section>
    </>
  );
}
