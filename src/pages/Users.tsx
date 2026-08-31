import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Ban,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users as UsersIcon,
  X,
} from "lucide-react";

import { supabase } from "../lib/supabase";

type UserRole = "Customer" | "Business";
type UserStatus = "Active" | "Disabled";

type User = {
  id: string;
  displayId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
  businessName?: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: "customer" | "business";
  account_status: "active" | "suspended";
  created_at: string;
};

type BusinessRow = {
  owner_id: string;
  name: string;
};

const roleFilters = [
  "All",
  "Customer",
  "Business",
] as const;

type RoleFilter =
  (typeof roleFilters)[number];

function createDisplayId(id: string) {
  const shortId = id
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `USR-${shortId}`;
}

function formatJoinedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

export default function Users() {
  const [users, setUsers] =
    useState<User[]>([]);

  const [search, setSearch] =
    useState("");

  const [selectedRole, setSelectedRole] =
    useState<RoleFilter>("All");

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [statusError, setStatusError] =
    useState("");

  const [
    isUpdatingStatus,
    setIsUpdatingStatus,
  ] = useState(false);

  const loadUsers =
    useCallback(async () => {
      try {
        setLoading(true);
        setPageError("");

        const [
          profileResult,
          businessResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              `
                id,
                email,
                full_name,
                phone,
                role,
                account_status,
                created_at
              `
            )
            .in("role", [
              "customer",
              "business",
            ])
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("businesses")
            .select("owner_id, name"),
        ]);

        if (profileResult.error) {
          throw profileResult.error;
        }

        if (businessResult.error) {
          throw businessResult.error;
        }

        const profiles =
          (profileResult.data ??
            []) as ProfileRow[];

        const businesses =
          (businessResult.data ??
            []) as BusinessRow[];

        const businessNamesByOwner =
          new Map(
            businesses.map((business) => [
              business.owner_id,
              business.name,
            ])
          );

        const mappedUsers: User[] =
          profiles.map((profile) => ({
            id: profile.id,

            displayId: createDisplayId(
              profile.id
            ),

            name:
              profile.full_name ||
              profile.email?.split(
                "@"
              )[0] ||
              "CargoTrackPH User",

            email:
              profile.email ||
              "No email provided",

            phone:
              profile.phone ||
              "Not provided",

            role:
              profile.role === "business"
                ? "Business"
                : "Customer",

            status:
              profile.account_status ===
              "active"
                ? "Active"
                : "Disabled",

            joined: formatJoinedDate(
              profile.created_at
            ),

            businessName:
              businessNamesByOwner.get(
                profile.id
              ),
          }));

        setUsers(mappedUsers);
      } catch (error) {
        console.error(
          "Unable to load users:",
          error
        );

        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to load user accounts."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return users.filter((user) => {
        const matchesRole =
          selectedRole === "All" ||
          user.role === selectedRole;

        const matchesSearch =
          !query ||
          user.name
            .toLowerCase()
            .includes(query) ||
          user.email
            .toLowerCase()
            .includes(query) ||
          user.phone
            .toLowerCase()
            .includes(query) ||
          user.businessName
            ?.toLowerCase()
            .includes(query);

        return (
          matchesRole &&
          Boolean(matchesSearch)
        );
      });
    }, [
      users,
      search,
      selectedRole,
    ]);

  const customerCount =
    users.filter(
      (user) =>
        user.role === "Customer"
    ).length;

  const businessCount =
    users.filter(
      (user) =>
        user.role === "Business"
    ).length;

  const disabledCount =
    users.filter(
      (user) =>
        user.status === "Disabled"
    ).length;

  const openUserDetails = (user: User) => {
    setStatusError("");
    setSelectedUser(user);
  };

  const closeUserDetails = () => {
    if (isUpdatingStatus) {
      return;
    }

    setStatusError("");
    setSelectedUser(null);
  };

  const updateUserStatus = async (
    status: UserStatus
  ) => {
    if (!selectedUser) {
      return;
    }

    const actionLabel =
      status === "Active"
        ? "activate"
        : "disable";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} ${selectedUser.name}'s account?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setStatusError("");

      const databaseStatus =
        status === "Active"
          ? "active"
          : "suspended";

      const { error } =
        await supabase.rpc(
          "set_user_account_status",
          {
            requested_user_id:
              selectedUser.id,

            requested_status:
              databaseStatus,
          }
        );

      if (error) {
        throw error;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                status,
              }
            : user
        )
      );

      setSelectedUser((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              status,
            }
          : null
      );
    } catch (error) {
      console.error(
        "Unable to update account:",
        error
      );

      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to update the account status."
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            SYSTEM ACCOUNTS
          </p>

          <h2>Users</h2>

          <p className="page-description">
            Monitor customer and business
            accounts in Cargo Track PH.
          </p>
        </div>

        <div className="users-header-badge">
          <UsersIcon size={17} />
          <span>
            {users.length} Accounts
          </span>
        </div>
      </div>

      <section className="user-stats">
        <UserStat
          title="Total Users"
          value={users.length}
          icon={
            <UsersIcon size={22} />
          }
          tone="blue"
        />

        <UserStat
          title="Customers"
          value={customerCount}
          icon={
            <UserRound size={22} />
          }
          tone="purple"
        />

        <UserStat
          title="Business Accounts"
          value={businessCount}
          icon={
            <BriefcaseBusiness
              size={22}
            />
          }
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
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search name, email, phone, or business..."
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="user-filters">
            {roleFilters.map((role) => (
              <button
                type="button"
                key={role}
                className={
                  selectedRole === role
                    ? "user-filter active"
                    : "user-filter"
                }
                onClick={() =>
                  setSelectedRole(role)
                }
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {pageError && (
          <div
            className="admin-login-error"
            style={{
              margin: "0 24px 18px",
            }}
          >
            <AlertCircle size={17} />

            <span>{pageError}</span>

            <button
              type="button"
              className="view-user-button"
              onClick={() =>
                void loadUsers()
              }
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

        <div className="user-result-bar">
          <div>
            <strong>
              {filteredUsers.length}
            </strong>

            <span>
              {filteredUsers.length === 1
                ? " user found"
                : " users found"}
            </span>
          </div>

          <span>
            Role: {selectedRole}
          </span>
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
              {loading && (
                <tr>
                  <td colSpan={6}>
                    <div className="users-empty">
                      <RefreshCw
                        size={30}
                      />

                      <strong>
                        Loading users...
                      </strong>

                      <span>
                        Retrieving accounts
                        from Supabase.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredUsers.map(
                  (user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-table-cell">
                          <div
                            className={
                              user.role ===
                              "Business"
                                ? "user-table-avatar business"
                                : "user-table-avatar"
                            }
                          >
                            {user.role ===
                            "Business" ? (
                              <BriefcaseBusiness
                                size={20}
                              />
                            ) : (
                              <UserRound
                                size={20}
                              />
                            )}
                          </div>

                          <div>
                            <strong>
                              {user.name}
                            </strong>

                            <span>
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            user.role ===
                            "Business"
                              ? "user-role business"
                              : "user-role"
                          }
                        >
                          {user.role ===
                          "Business" ? (
                            <BriefcaseBusiness
                              size={13}
                            />
                          ) : (
                            <UserRound
                              size={13}
                            />
                          )}

                          {user.role}
                        </span>
                      </td>

                      <td>
                        {user.phone}
                      </td>

                      <td>
                        {user.joined}
                      </td>

                      <td>
                        <UserStatusBadge
                          status={
                            user.status
                          }
                        />
                      </td>

                      <td className="user-action-cell">
                        <button
                          type="button"
                          className="view-user-button"
                          onClick={() =>
                            openUserDetails(
                              user
                            )
                          }
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                )}

              {!loading &&
                !pageError &&
                filteredUsers.length ===
                  0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="users-empty">
                        <UsersIcon
                          size={34}
                        />

                        <strong>
                          No users found
                        </strong>

                        <span>
                          {users.length === 0
                            ? "No customer or business accounts have registered yet."
                            : "Try changing the search or role filter."}
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
                <p className="eyebrow">
                  SYSTEM ACCOUNT
                </p>

                <h3>
                  Account Details
                </h3>

                <span>
                  {selectedUser.displayId}
                </span>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeUserDetails
                }
                disabled={
                  isUpdatingStatus
                }
                aria-label="Close account details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="application-modal-body">
              <div className="user-detail-hero">
                <div
                  className={
                    selectedUser.role ===
                    "Business"
                      ? "user-detail-avatar business"
                      : "user-detail-avatar"
                  }
                >
                  {selectedUser.role ===
                  "Business" ? (
                    <BriefcaseBusiness
                      size={30}
                    />
                  ) : (
                    <UserRound
                      size={30}
                    />
                  )}
                </div>

                <div>
                  <h3>
                    {selectedUser.name}
                  </h3>

                  <p>
                    {selectedUser.role}{" "}
                    Account
                  </p>
                </div>

                <UserStatusBadge
                  status={
                    selectedUser.status
                  }
                />
              </div>

              <div className="detail-grid">
                <UserDetailCard
                  icon={
                    <Mail size={18} />
                  }
                  label="Email Address"
                  value={
                    selectedUser.email
                  }
                />

                <UserDetailCard
                  icon={
                    <Phone size={18} />
                  }
                  label="Phone Number"
                  value={
                    selectedUser.phone
                  }
                />

                <UserDetailCard
                  icon={
                    <ShieldCheck
                      size={18}
                    />
                  }
                  label="Account Role"
                  value={
                    selectedUser.role
                  }
                />

                <UserDetailCard
                  icon={
                    <CheckCircle2
                      size={18}
                    />
                  }
                  label="Date Joined"
                  value={
                    selectedUser.joined
                  }
                />
              </div>

              {selectedUser.businessName && (
                <div className="linked-user-business">
                  <div className="linked-user-business-icon">
                    <BriefcaseBusiness
                      size={22}
                    />
                  </div>

                  <div>
                    <span>
                      LINKED BUSINESS
                    </span>

                    <strong>
                      {
                        selectedUser.businessName
                      }
                    </strong>
                  </div>
                </div>
              )}

              <div className="user-status-section">
                <h4>
                  Account Status
                </h4>

                <div className="user-status-info">
                  <div
                    className={
                      selectedUser.status ===
                      "Active"
                        ? "user-status-info-icon active"
                        : "user-status-info-icon disabled"
                    }
                  >
                    {selectedUser.status ===
                    "Active" ? (
                      <CheckCircle2
                        size={22}
                      />
                    ) : (
                      <Ban size={22} />
                    )}
                  </div>

                  <div>
                    <strong>
                      {
                        selectedUser.status
                      }
                    </strong>

                    <span>
                      {selectedUser.status ===
                      "Active"
                        ? "This account currently has access to the system."
                        : "This account is currently disabled."}
                    </span>
                  </div>
                </div>
              </div>

              {statusError && (
                <div className="admin-login-error">
                  <AlertCircle
                    size={17}
                  />

                  <span>
                    {statusError}
                  </span>
                </div>
              )}

              <div className="user-permission-note">
                Admin can view account
                information and manage account
                status. Editing personal data,
                passwords, and deleting accounts
                are not enabled.
              </div>
            </div>

            <div className="application-modal-footer">
              {selectedUser.status ===
              "Active" ? (
                <button
                  type="button"
                  className="disable-user-button"
                  disabled={
                    isUpdatingStatus
                  }
                  onClick={() =>
                    void updateUserStatus(
                      "Disabled"
                    )
                  }
                >
                  <Ban size={18} />

                  {isUpdatingStatus
                    ? "Disabling..."
                    : "Disable Account"}
                </button>
              ) : (
                <button
                  type="button"
                  className="activate-user-button"
                  disabled={
                    isUpdatingStatus
                  }
                  onClick={() =>
                    void updateUserStatus(
                      "Active"
                    )
                  }
                >
                  <CheckCircle2
                    size={18}
                  />

                  {isUpdatingStatus
                    ? "Activating..."
                    : "Activate Account"}
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
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="user-stat-card">
      <div
        className={
          `application-stat-icon ${tone}`
        }
      >
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
    <span
      className={
        `user-status ${status.toLowerCase()}`
      }
    >
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
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="detail-card">
      <div className="detail-card-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}