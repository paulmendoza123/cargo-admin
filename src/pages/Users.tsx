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
  Clock3,
  Eye,
  FileCheck2,
  History,
  Image as ImageIcon,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users as UsersIcon,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useAdminPageSearch } from "../hooks/useAdminPageSearch";
import ConfirmDialog from "../components/ConfirmDialog";

type UserRole = "Customer" | "Business";
type UserStatus = "Active" | "Disabled";
type VerificationStatus =
  | "Not Submitted"
  | "Pending"
  | "Verified"
  | "Rejected";

type IdentityDocument = {
  id: string;
  idType: string;
  storagePath: string;
  verificationStatus: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

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
  identityDocument?: IdentityDocument;
};

type AdminUserRow = {
  user_id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  user_role: "customer" | "business";
  account_status: "active" | "suspended";
  created_at: string;
  business_name: string | null;
  identity_document_id: string | null;
  identity_id_type: string | null;
  identity_storage_path: string | null;
  identity_verification_status: string | null;
  identity_submitted_at: string | null;
  identity_reviewed_at: string | null;
  identity_rejection_reason: string | null;
};

type UserActivityRow = {
  activity_id: string;
  activity_type: "account" | "identity";
  old_status: string | null;
  new_status: string;
  note: string | null;
  changed_at: string;
  changed_by: string | null;
  changed_by_name: string | null;
};

type UserActivity = {
  id: string;
  type: "Account" | "Identity Verification";
  oldStatus?: string;
  newStatus: string;
  note?: string;
  changedAt: string;
  changedBy: string;
};

type PendingUserAction =
  | {
      kind: "status";
      status: UserStatus;
    }
  | {
      kind: "identity";
      status: "Verified" | "Rejected";
    };

const CUSTOMER_ID_BUCKET = "customer-ids";

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

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(value?: string | null) {
  if (!value) {
    return "Initial";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function normalizeVerificationStatus(
  value?: string | null
): VerificationStatus {
  switch (value?.toLowerCase()) {
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "pending":
      return "Pending";
    default:
      return "Not Submitted";
  }
}

export default function Users() {
  const [users, setUsers] =
    useState<User[]>([]);
  const [search, setSearch] =
    useAdminPageSearch();
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
  const [verificationError, setVerificationError] =
    useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] =
    useState(false);
  const [isReviewingIdentity, setIsReviewingIdentity] =
    useState(false);
  const [identityPreviewUrl, setIdentityPreviewUrl] =
    useState("");
  const [identityPreviewLoading, setIdentityPreviewLoading] =
    useState(false);
  const [identityPreviewError, setIdentityPreviewError] =
    useState("");
  const [rejectionReason, setRejectionReason] =
    useState("");
  const [activity, setActivity] =
    useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] =
    useState(false);
  const [activityError, setActivityError] =
    useState("");
  const [pendingAction, setPendingAction] =
    useState<PendingUserAction | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const { data, error } = await supabase.rpc(
        "get_admin_users"
      );

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as AdminUserRow[];

      const mappedUsers: User[] = rows.map(
        (row) => ({
          id: row.user_id,
          displayId: createDisplayId(row.user_id),
          name:
            row.full_name ||
            row.email?.split("@")[0] ||
            "CargoTrackPH User",
          email:
            row.email || "No email provided",
          phone: row.phone || "Not provided",
          role:
            row.user_role === "business"
              ? "Business"
              : "Customer",
          status:
            row.account_status === "active"
              ? "Active"
              : "Disabled",
          joined: formatDate(row.created_at),
          businessName: row.business_name ?? undefined,
          identityDocument:
            row.user_role === "customer" &&
            row.identity_document_id &&
            row.identity_id_type &&
            row.identity_storage_path &&
            row.identity_submitted_at
              ? {
                  id: row.identity_document_id,
                  idType: row.identity_id_type,
                  storagePath: row.identity_storage_path,
                  verificationStatus:
                    normalizeVerificationStatus(
                      row.identity_verification_status
                    ),
                  submittedAt: row.identity_submitted_at,
                  reviewedAt:
                    row.identity_reviewed_at ?? undefined,
                  rejectionReason:
                    row.identity_rejection_reason ?? undefined,
                }
              : undefined,
        })
      );

      setUsers(mappedUsers);
    } catch (error) {
      console.error("Unable to load users:", error);

      setPageError(
        getErrorMessage(error, "Unable to load user accounts.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserActivity = useCallback(
    async (userId: string) => {
      try {
        setActivityLoading(true);
        setActivityError("");

        const { data, error } = await supabase.rpc(
          "get_admin_user_activity",
          { requested_user_id: userId }
        );

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as UserActivityRow[];

        setActivity(
          rows.map((row) => ({
            id: row.activity_id,
            type:
              row.activity_type === "identity"
                ? "Identity Verification"
                : "Account",
            oldStatus: row.old_status ?? undefined,
            newStatus: row.new_status,
            note: row.note ?? undefined,
            changedAt: row.changed_at,
            changedBy:
              row.changed_by_name || "Administrator",
          }))
        );
      } catch (error) {
        console.error(
          "Unable to load user activity:",
          error
        );

        setActivity([]);
        setActivityError(
          getErrorMessage(
            error,
            "Unable to load administrative activity."
          )
        );
      } finally {
        setActivityLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const initialLoad =
      window.setTimeout(
        () => {
          void loadUsers();
        },
        0
      );

    return () => {
      window.clearTimeout(
        initialLoad
      );
    };
  }, [loadUsers]);

  const selectedIdentityDocument =
    selectedUser?.identityDocument;

  useEffect(() => {
    let active = true;

    const loadPreview =
      window.setTimeout(
        () => {
          setIdentityPreviewUrl("");
          setIdentityPreviewError("");

          if (!selectedIdentityDocument) {
            setIdentityPreviewLoading(false);
            return;
          }

          setIdentityPreviewLoading(true);

          void supabase.storage
            .from(CUSTOMER_ID_BUCKET)
            .createSignedUrl(
              selectedIdentityDocument.storagePath,
              300
            )
            .then(({ data, error }) => {
              if (!active) {
                return;
              }

              if (error) {
                throw error;
              }

              setIdentityPreviewUrl(
                data.signedUrl
              );
            })
            .catch((error: unknown) => {
              if (!active) {
                return;
              }

              console.error(
                "Unable to load identity document:",
                error
              );

              setIdentityPreviewError(
                getErrorMessage(
                  error,
                  "Unable to load the private ID image."
                )
              );
            })
            .finally(() => {
              if (active) {
                setIdentityPreviewLoading(
                  false
                );
              }
            });
        },
        0
      );

    return () => {
      active = false;
      window.clearTimeout(loadPreview);
    };
  }, [selectedIdentityDocument]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        selectedRole === "All" ||
        user.role === selectedRole;

      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.toLowerCase().includes(query) ||
        user.businessName
          ?.toLowerCase()
          .includes(query);

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

  const pendingVerificationCount = users.filter(
    (user) =>
      user.identityDocument?.verificationStatus ===
      "Pending"
  ).length;

  const openUserDetails = (user: User) => {
    setStatusError("");
    setVerificationError("");
    setActivity([]);
    setActivityError("");
    setRejectionReason(
      user.identityDocument?.rejectionReason ?? ""
    );
    setSelectedUser(user);
    void loadUserActivity(user.id);
  };

  const closeUserDetails = () => {
    if (isUpdatingStatus || isReviewingIdentity) {
      return;
    }

    setPendingAction(null);
    setStatusError("");
    setVerificationError("");
    setActivity([]);
    setActivityError("");
    setSelectedUser(null);
  };

  const updateUserStatus = async (
    status: UserStatus
  ) => {
    if (!selectedUser) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setStatusError("");

      const databaseStatus =
        status === "Active" ? "active" : "suspended";

      const { error } = await supabase.rpc(
        "set_admin_managed_user_status",
        {
          target_user_id: selectedUser.id,
          target_status: databaseStatus,
        }
      );

      if (error) {
        throw error;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === selectedUser.id
            ? { ...user, status }
            : user
        )
      );

      setSelectedUser((currentUser) =>
        currentUser
          ? { ...currentUser, status }
          : null
      );
      window.dispatchEvent(
        new Event("cargo:users-changed")
      );
      await loadUserActivity(selectedUser.id);
    } catch (error) {
      console.error("Unable to update account:", error);

      setStatusError(
        getErrorMessage(
          error,
          "Unable to update the account status."
        )
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const reviewIdentityDocument = async (
    nextStatus: "Verified" | "Rejected"
  ) => {
    const document = selectedUser?.identityDocument;

    if (!selectedUser || !document) {
      return;
    }

    const trimmedReason = rejectionReason.trim();

    if (nextStatus === "Rejected" && !trimmedReason) {
      setVerificationError(
        "Enter a rejection reason before rejecting the ID."
      );
      return;
    }

    try {
      setIsReviewingIdentity(true);
      setVerificationError("");

      const { error } = await supabase.rpc(
        "review_customer_identity_document",
        {
          requested_document_id: document.id,
          requested_status: nextStatus.toLowerCase(),
          requested_rejection_reason:
            nextStatus === "Rejected"
              ? trimmedReason
              : null,
        }
      );

      if (error) {
        throw error;
      }

      const nextDocument: IdentityDocument = {
        ...document,
        verificationStatus: nextStatus,
        reviewedAt: new Date().toISOString(),
        rejectionReason:
          nextStatus === "Rejected"
            ? trimmedReason
            : undefined,
      };

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                identityDocument: nextDocument,
              }
            : user
        )
      );

      setSelectedUser((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              identityDocument: nextDocument,
            }
          : null
      );

      if (nextStatus === "Verified") {
        setRejectionReason("");
      }

      window.dispatchEvent(
        new Event("cargo:users-changed")
      );
      await loadUserActivity(selectedUser.id);
    } catch (error) {
      console.error(
        "Unable to review identity document:",
        error
      );

      setVerificationError(
        getErrorMessage(
          error,
          "Unable to update the verification status."
        )
      );
    } finally {
      setIsReviewingIdentity(false);
    }
  };

  const beginIdentityReview = (
    status: "Verified" | "Rejected"
  ) => {
    if (status === "Rejected" && !rejectionReason.trim()) {
      setVerificationError(
        "Enter a rejection reason before rejecting the ID."
      );
      return;
    }

    setVerificationError("");
    setPendingAction({ kind: "identity", status });
  };

  const confirmPendingAction = async () => {
    const action = pendingAction;

    if (!action) {
      return;
    }

    setPendingAction(null);

    if (action.kind === "status") {
      await updateUserStatus(action.status);
      return;
    }

    await reviewIdentityDocument(action.status);
  };

  const pendingActionCopy = (() => {
    if (!selectedUser || !pendingAction) {
      return null;
    }

    if (pendingAction.kind === "status") {
      const disabling = pendingAction.status === "Disabled";
      return {
        title: disabling ? "Disable this account?" : "Activate this account?",
        description: disabling
          ? `${selectedUser.name} will lose access until an administrator activates the account again.`
          : `${selectedUser.name} will regain access to Cargo Track PH.`,
        confirmLabel: disabling ? "Disable account" : "Activate account",
        tone: disabling ? ("danger" as const) : ("primary" as const),
      };
    }

    const rejecting = pendingAction.status === "Rejected";
    return {
      title: rejecting ? "Reject this submitted ID?" : "Approve this submitted ID?",
      description: rejecting
        ? `The rejection reason will be shown to ${selectedUser.name}.`
        : `${selectedUser.name}'s identity verification will be marked as approved.`,
      confirmLabel: rejecting ? "Reject ID" : "Approve ID",
      tone: rejecting ? ("danger" as const) : ("primary" as const),
    };
  })();

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SYSTEM ACCOUNTS</p>
          <h2>Users</h2>
          <p className="page-description">
            Monitor accounts and review customer identity
            verification in Cargo Track PH.
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
          title="Pending IDs"
          value={pendingVerificationCount}
          icon={<Clock3 size={22} />}
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
                setSearch(event.target.value)
              }
              placeholder="Search name, email, phone, or business..."
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
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
                onClick={() => setSelectedRole(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {pageError && (
          <div
            className="admin-login-error"
            style={{ margin: "0 24px 18px" }}
          >
            <AlertCircle size={17} />
            <span>{pageError}</span>
            <button
              type="button"
              className="view-user-button"
              onClick={() => void loadUsers()}
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

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
                <th>Account</th>
                <th>Verification</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}>
                    <div className="users-empty">
                      <RefreshCw size={30} />
                      <strong>Loading users...</strong>
                      <span>
                        Retrieving customer and business accounts.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredUsers.map((user) => (
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
                    <td>
                      {user.role === "Customer" ? (
                        <VerificationBadge
                          status={
                            user.identityDocument
                              ?.verificationStatus ??
                            "Not Submitted"
                          }
                        />
                      ) : (
                        <span className="identity-verification-badge verified">
                          <CheckCircle2 size={13} />
                          Verified
                        </span>
                      )}
                    </td>

                    <td className="user-action-cell">
                      <button
                        type="button"
                        className="view-user-button"
                        onClick={() => openUserDetails(user)}
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading &&
                !pageError &&
                filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="users-empty">
                        <UsersIcon size={34} />
                        <strong>No users found</strong>
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
          <div className="user-modal identity-user-modal">
            <div className="application-modal-header">
              <div>
                <p className="eyebrow">SYSTEM ACCOUNT</p>
                <h3>Account Details</h3>
                <span>{selectedUser.displayId}</span>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeUserDetails}
                disabled={
                  isUpdatingStatus || isReviewingIdentity
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

              {selectedUser.role === "Customer" && (
                <section className="identity-review-section">
                  <div className="identity-review-heading">
                    <div>
                      <span className="identity-review-eyebrow">
                        CUSTOMER VERIFICATION
                      </span>
                      <h4>Government ID Review</h4>
                    </div>
                    <VerificationBadge
                      status={
                        selectedUser.identityDocument
                          ?.verificationStatus ??
                        "Not Submitted"
                      }
                    />
                  </div>

                  {!selectedUser.identityDocument ? (
                    <div className="identity-empty-state">
                      <ImageIcon size={28} />
                      <strong>No ID submitted</strong>
                      <span>
                        This customer has not submitted an
                        identity document.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="identity-document-meta">
                        <div>
                          <span>ID Type</span>
                          <strong>
                            {selectedUser.identityDocument.idType}
                          </strong>
                        </div>
                        <div>
                          <span>Submitted</span>
                          <strong>
                            {formatDate(
                              selectedUser.identityDocument
                                .submittedAt
                            )}
                          </strong>
                        </div>
                        <div>
                          <span>Last Reviewed</span>
                          <strong>
                            {formatDate(
                              selectedUser.identityDocument
                                .reviewedAt
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="identity-private-note">
                        <ShieldCheck size={17} />
                        <span>
                          Private document. The preview link
                          expires automatically after five
                          minutes.
                        </span>
                      </div>

                      <div className="identity-preview">
                        {identityPreviewLoading && (
                          <div className="identity-preview-state">
                            <RefreshCw size={25} />
                            <span>Loading private ID...</span>
                          </div>
                        )}

                        {!identityPreviewLoading &&
                          identityPreviewError && (
                            <div className="identity-preview-state error">
                              <AlertCircle size={25} />
                              <span>{identityPreviewError}</span>
                            </div>
                          )}

                        {!identityPreviewLoading &&
                          !identityPreviewError &&
                          identityPreviewUrl && (
                            <a
                              href={identityPreviewUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open private ID in a new tab"
                            >
                              <img
                                src={identityPreviewUrl}
                                alt={`${selectedUser.name} submitted ID`}
                              />
                            </a>
                          )}
                      </div>

                      {selectedUser.identityDocument
                        .verificationStatus === "Rejected" &&
                        selectedUser.identityDocument
                          .rejectionReason && (
                          <div className="identity-existing-rejection">
                            <XCircle size={18} />
                            <div>
                              <strong>Current rejection reason</strong>
                              <span>
                                {
                                  selectedUser.identityDocument
                                    .rejectionReason
                                }
                              </span>
                            </div>
                          </div>
                        )}

                      <label className="identity-rejection-field">
                        <span>
                          Rejection reason
                          <small>
                            Required only when rejecting
                          </small>
                        </span>
                        <textarea
                          value={rejectionReason}
                          onChange={(event) => {
                            setRejectionReason(
                              event.target.value
                            );
                            setVerificationError("");
                          }}
                          maxLength={500}
                          placeholder="Example: The submitted image is not a readable government-issued ID."
                          disabled={isReviewingIdentity}
                        />
                      </label>

                      {verificationError && (
                        <div className="admin-login-error">
                          <AlertCircle size={17} />
                          <span>{verificationError}</span>
                        </div>
                      )}

                      <div className="identity-review-actions">
                        <button
                          type="button"
                          className="identity-reject-button"
                          disabled={isReviewingIdentity}
                          onClick={() =>
                            beginIdentityReview("Rejected")
                          }
                        >
                          <XCircle size={18} />
                          {isReviewingIdentity
                            ? "Saving..."
                            : "Reject ID"}
                        </button>

                        <button
                          type="button"
                          className="identity-approve-button"
                          disabled={isReviewingIdentity}
                          onClick={() =>
                            beginIdentityReview("Verified")
                          }
                        >
                          <FileCheck2 size={18} />
                          {isReviewingIdentity
                            ? "Saving..."
                            : "Approve ID"}
                        </button>
                      </div>
                    </>
                  )}
                </section>
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

              <section className="user-activity-section">
                <div className="user-activity-heading">
                  <div>
                    <History size={18} />
                    <h4>Administrative activity</h4>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void loadUserActivity(selectedUser.id)
                    }
                    disabled={activityLoading}
                  >
                    <RefreshCw
                      size={14}
                      className={activityLoading ? "spin" : ""}
                    />
                    Refresh
                  </button>
                </div>

                {activityError ? (
                  <div className="user-activity-empty error">
                    <AlertCircle size={18} />
                    <span>{activityError}</span>
                  </div>
                ) : activityLoading ? (
                  <div className="user-activity-empty">
                    Loading administrative activity...
                  </div>
                ) : activity.length === 0 ? (
                  <div className="user-activity-empty">
                    No administrative changes recorded yet.
                  </div>
                ) : (
                  <div className="user-activity-list">
                    {activity.map((entry) => (
                      <div
                        className="user-activity-item"
                        key={entry.id}
                      >
                        <span
                          className={`user-activity-dot ${entry.newStatus.toLowerCase()}`}
                        />

                        <div>
                          <div className="user-activity-item-top">
                            <strong>{entry.type}</strong>
                            <span>
                              {formatStatus(entry.oldStatus)} →{" "}
                              {formatStatus(entry.newStatus)}
                            </span>
                          </div>

                          {entry.note && <p>{entry.note}</p>}

                          <small>
                            {entry.changedBy} ·{" "}
                            {formatDateTime(entry.changedAt)}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {statusError && (
                <div className="admin-login-error">
                  <AlertCircle size={17} />
                  <span>{statusError}</span>
                </div>
              )}

              <div className="user-permission-note">
                Customer ID verification and account access are
                separate controls. Approving an ID does not
                automatically activate a disabled account.
              </div>
            </div>

            <div className="application-modal-footer">
              {selectedUser.status === "Active" ? (
                <button
                  type="button"
                  className="disable-user-button"
                  disabled={
                    isUpdatingStatus || isReviewingIdentity
                  }
                  onClick={() =>
                    setPendingAction({
                      kind: "status",
                      status: "Disabled",
                    })
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
                    isUpdatingStatus || isReviewingIdentity
                  }
                  onClick={() =>
                    setPendingAction({
                      kind: "status",
                      status: "Active",
                    })
                  }
                >
                  <CheckCircle2 size={18} />
                  {isUpdatingStatus
                    ? "Activating..."
                    : "Activate Account"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingActionCopy)}
        title={pendingActionCopy?.title ?? "Confirm action"}
        description={pendingActionCopy?.description ?? ""}
        confirmLabel={pendingActionCopy?.confirmLabel ?? "Confirm"}
        tone={pendingActionCopy?.tone}
        busy={isUpdatingStatus || isReviewingIdentity}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmPendingAction()}
      />
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

function VerificationBadge({
  status,
}: {
  status: VerificationStatus;
}) {
  const className = status
    .toLowerCase()
    .replace(" ", "-");
  const label = status === "Verified" ? "Approved" : status;

  return (
    <span className={`identity-verification-badge ${className}`}>
      {status === "Verified" && <CheckCircle2 size={13} />}
      {status === "Pending" && <Clock3 size={13} />}
      {status === "Rejected" && <XCircle size={13} />}
      {status === "Not Submitted" && <ImageIcon size={13} />}
      {label}
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
      <div className="detail-card-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
