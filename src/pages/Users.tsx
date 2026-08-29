import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  Users as UsersIcon,
  X,
} from "lucide-react";

type UserRole = "Customer" | "Business";
type UserStatus = "Active" | "Disabled";

type User = {
  id: string;
  sourceApplicationId?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
  businessName?: string;
};

type ApprovedApplication = {
  id: string;
  businessName: string;
  representativeName: string;
  email: string;
  phone: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  reviewedAt?: string;
};

const USERS_STORAGE_KEY =
  "cargo-track-admin-users-v1";

const APPLICATIONS_STORAGE_KEY =
  "cargo-track-admin-business-applications-v1";

const initialUsers: User[] = [
  {
    id: "USR-001",
    name: "Juan Dela Cruz",
    email: "juan@gmail.com",
    phone: "0917 123 4567",
    role: "Customer",
    status: "Active",
    joined: "Aug 22, 2026",
  },
  {
    id: "USR-002",
    name: "Maria Santos",
    email: "maria@gmail.com",
    phone: "0918 234 5678",
    role: "Customer",
    status: "Active",
    joined: "Aug 21, 2026",
  },
  {
    id: "USR-003",
    name: "Michael Santos",
    email: "abccargo@example.com",
    phone: "0917 123 4567",
    role: "Business",
    status: "Active",
    joined: "Aug 20, 2026",
    businessName: "ABC Cargo Express",
  },
  {
    id: "USR-004",
    name: "Leonardo Cruz",
    email: "xyzcargo@example.com",
    phone: "0918 222 3344",
    role: "Business",
    status: "Active",
    joined: "Aug 18, 2026",
    businessName: "XYZ Cargo Services",
  },
  {
    id: "USR-005",
    name: "Andrea Reyes",
    email: "palawancargo@example.com",
    phone: "0919 333 4455",
    role: "Business",
    status: "Disabled",
    joined: "Aug 16, 2026",
    businessName: "Palawan Cargo Lines",
  },
];

function formatJoinedDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function readApprovedApplications(): ApprovedApplication[] {
  try {
    const raw = window.localStorage.getItem(
      APPLICATIONS_STORAGE_KEY
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return (parsed as ApprovedApplication[]).filter(
      (application) => application.status === "Approved"
    );
  } catch {
    return [];
  }
}

function applicationToUser(application: ApprovedApplication): User {
  return {
    id: `USR-${application.id.replace(/^APP-/, "")}`,
    sourceApplicationId: application.id,
    name: application.representativeName,
    email: application.email,
    phone: application.phone,
    role: "Business",
    status: "Active",
    joined: formatJoinedDate(
      application.reviewedAt || application.submittedAt
    ),
    businessName: application.businessName,
  };
}

function loadUsers(): User[] {
  let storedUsers = initialUsers;

  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        storedUsers = parsed as User[];
      }
    }
  } catch {
    storedUsers = initialUsers;
  }

  const approvedApplications = readApprovedApplications();
  const approvedIds = new Set(
    approvedApplications.map((application) => application.id)
  );

  const syncedUsers = storedUsers.filter(
    (user) =>
      !user.sourceApplicationId ||
      approvedIds.has(user.sourceApplicationId)
  );

  approvedApplications.forEach((application) => {
    const existingIndex = syncedUsers.findIndex(
      (user) => user.sourceApplicationId === application.id
    );

    const applicationUser = applicationToUser(application);

    if (existingIndex === -1) {
      syncedUsers.push(applicationUser);
      return;
    }

    syncedUsers[existingIndex] = {
      ...applicationUser,
      status: syncedUsers[existingIndex].status,
    };
  });

  return syncedUsers;
}

const roleFilters = ["All", "Customer", "Business"] as const;
type RoleFilter = (typeof roleFilters)[number];

export default function Users() {
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<RoleFilter>("All");
  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      USERS_STORAGE_KEY,
      JSON.stringify(users)
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        selectedRole === "All" || user.role === selectedRole;

      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.businessName?.toLowerCase().includes(query);

      return matchesRole && Boolean(matchesSearch);
    });
  }, [users, search, selectedRole]);

  const customerCount = users.filter(
    (user) => user.role === "Customer"
  ).length;

  const businessCount = users.filter(
    (user) => user.role === "Business"
  ).length;

  const disabledCount = users.filter(
    (user) => user.status === "Disabled"
  ).length;

  const updateUserStatus = (status: UserStatus) => {
    if (!selectedUser) return;

    setUsers((current) =>
      current.map((user) =>
        user.id === selectedUser.id
          ? { ...user, status }
          : user
      )
    );

    setSelectedUser({
      ...selectedUser,
      status,
    });
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SYSTEM ACCOUNTS</p>
          <h2>Users</h2>
          <p className="page-description">
            Monitor customer and business accounts in Cargo Track PH.
          </p>
        </div>

        <div className="users-header-badge">
          <UsersIcon size={17} />
          <span>{users.length} Accounts</span>
        </div>
      </div>

      <section className="user-stats">
        <UserStat
          title="Total Users"
          value={users.length}
          icon={<UsersIcon size={22} />}
          tone="blue"
        />

        <UserStat
          title="Customers"
          value={customerCount}
          icon={<UserRound size={22} />}
          tone="purple"
        />

        <UserStat
          title="Business Accounts"
          value={businessCount}
          icon={<BriefcaseBusiness size={22} />}
          tone="yellow"
        />

        <UserStat
          title="Disabled"
          value={disabledCount}
          icon={<Ban size={22} />}
          tone="red"
        />
      </section>

      <section className="users-page-panel">
        <div className="users-toolbar">
          <div className="users-search">
            <Search size={18} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or business..."
            />

            {search && (
              <button onClick={() => setSearch("")}>
                <X size={17} />
              </button>
            )}
          </div>

          <div className="user-filters">
            {roleFilters.map((role) => (
              <button
                key={role}
                className={
                  selectedRole === role
                    ? "user-filter active"
                    : "user-filter"
                }
                onClick={() => setSelectedRole(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="user-result-bar">
          <div>
            <strong>{filteredUsers.length}</strong>
            <span>
              {filteredUsers.length === 1
                ? " user found"
                : " users found"}
            </span>
          </div>

          <span>Role: {selectedRole}</span>
        </div>

        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-table-cell">
                      <div
                        className={
                          user.role === "Business"
                            ? "user-table-avatar business"
                            : "user-table-avatar"
                        }
                      >
                        {user.role === "Business" ? (
                          <BriefcaseBusiness size={20} />
                        ) : (
                          <UserRound size={20} />
                        )}
                      </div>

                      <div>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={
                        user.role === "Business"
                          ? "user-role business"
                          : "user-role"
                      }
                    >
                      {user.role === "Business" ? (
                        <BriefcaseBusiness size={13} />
                      ) : (
                        <UserRound size={13} />
                      )}

                      {user.role}
                    </span>
                  </td>

                  <td>{user.phone}</td>
                  <td>{user.joined}</td>

                  <td>
                    <UserStatusBadge status={user.status} />
                  </td>

                  <td className="user-action-cell">
                    <button
                      className="view-user-button"
                      onClick={() => setSelectedUser(user)}
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="users-empty">
                      <UsersIcon size={34} />
                      <strong>No users found</strong>
                      <span>
                        Try changing the search or role filter.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && (
        <div className="web-modal-overlay">
          <div className="user-modal">
            <div className="application-modal-header">
              <div>
                <p className="eyebrow">SYSTEM ACCOUNT</p>
                <h3>Account Details</h3>
                <span>{selectedUser.id}</span>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedUser(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="application-modal-body">
              <div className="user-detail-hero">
                <div
                  className={
                    selectedUser.role === "Business"
                      ? "user-detail-avatar business"
                      : "user-detail-avatar"
                  }
                >
                  {selectedUser.role === "Business" ? (
                    <BriefcaseBusiness size={30} />
                  ) : (
                    <UserRound size={30} />
                  )}
                </div>

                <div>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.role} Account</p>
                </div>

                <UserStatusBadge status={selectedUser.status} />
              </div>

              <div className="detail-grid">
                <UserDetailCard
                  icon={<Mail size={18} />}
                  label="Email Address"
                  value={selectedUser.email}
                />

                <UserDetailCard
                  icon={<Phone size={18} />}
                  label="Phone Number"
                  value={selectedUser.phone}
                />

                <UserDetailCard
                  icon={<ShieldCheck size={18} />}
                  label="Account Role"
                  value={selectedUser.role}
                />

                <UserDetailCard
                  icon={<CheckCircle2 size={18} />}
                  label="Date Joined"
                  value={selectedUser.joined}
                />
              </div>

              {selectedUser.businessName && (
                <div className="linked-user-business">
                  <div className="linked-user-business-icon">
                    <BriefcaseBusiness size={22} />
                  </div>

                  <div>
                    <span>LINKED BUSINESS</span>
                    <strong>{selectedUser.businessName}</strong>
                  </div>
                </div>
              )}

              <div className="user-status-section">
                <h4>Account Status</h4>

                <div className="user-status-info">
                  <div
                    className={
                      selectedUser.status === "Active"
                        ? "user-status-info-icon active"
                        : "user-status-info-icon disabled"
                    }
                  >
                    {selectedUser.status === "Active" ? (
                      <CheckCircle2 size={22} />
                    ) : (
                      <Ban size={22} />
                    )}
                  </div>

                  <div>
                    <strong>{selectedUser.status}</strong>

                    <span>
                      {selectedUser.status === "Active"
                        ? "This account currently has access to the system."
                        : "This account is currently disabled."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="user-permission-note">
                Admin can currently view account information and manage
                account status. Editing personal data, passwords, and
                deleting accounts are not enabled yet.
              </div>
            </div>

            <div className="application-modal-footer">
              {selectedUser.status === "Active" ? (
                <button
                  className="disable-user-button"
                  onClick={() => updateUserStatus("Disabled")}
                >
                  <Ban size={18} />
                  Disable Account
                </button>
              ) : (
                <button
                  className="activate-user-button"
                  onClick={() => updateUserStatus("Active")}
                >
                  <CheckCircle2 size={18} />
                  Activate Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function UserStat({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="user-stat-card">
      <div className={`application-stat-icon ${tone}`}>
        {icon}
      </div>

      <div>
        <strong>{value}</strong>
        <span>{title}</span>
      </div>
    </div>
  );
}

function UserStatusBadge({
  status,
}: {
  status: UserStatus;
}) {
  return (
    <span className={`user-status ${status.toLowerCase()}`}>
      <span />
      {status}
    </span>
  );
}

function UserDetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="detail-card">
      <div className="detail-card-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
