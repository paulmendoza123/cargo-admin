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

type IdentityDocumentRow = {
  id: string;
  customer_id: string;
  id_type: string;
  storage_path: string;
  verification_status: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
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

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const [
        profileResult,
        businessResult,
        identityResult,
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
          .in("role", ["customer", "business"])
          .order("created_at", { ascending: false }),

        supabase
          .from("businesses")
          .select("owner_id, name"),

        supabase
          .from("customer_identity_documents")
          .select(
            `
              id,
              customer_id,
              id_type,
              storage_path,
              verification_status,
              created_at,
              reviewed_at,
              rejection_reason
            `
          )
          .order("created_at", { ascending: false }),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (businessResult.error) {
        throw businessResult.error;
      }

      if (identityResult.error) {
        throw identityResult.error;
      }

      const profiles =
        (profileResult.data ?? []) as ProfileRow[];
      const businesses =
        (businessResult.data ?? []) as BusinessRow[];
      const identityDocuments =
        (identityResult.data ?? []) as IdentityDocumentRow[];

      const businessNamesByOwner = new Map(
        businesses.map((business) => [
          business.owner_id,
          business.name,
        ])
      );

      const identityByCustomer =
        new Map<string, IdentityDocument>();

      identityDocuments.forEach((document) => {
        if (identityByCustomer.has(document.customer_id)) {
          return;
        }

        identityByCustomer.set(document.customer_id, {
          id: document.id,
          idType: document.id_type,
          storagePath: document.storage_path,
          verificationStatus:
            normalizeVerificationStatus(
              document.verification_status
            ),
          submittedAt: document.created_at,
          reviewedAt: document.reviewed_at ?? undefined,
          rejectionReason:
            document.rejection_reason ?? undefined,
        });
      });

      const mappedUsers: User[] = profiles.map(
        (profile) => ({
          id: profile.id,
          displayId: createDisplayId(profile.id),
          name:
            profile.full_name ||
            profile.email?.split("@")[0] ||
            "CargoTrackPH User",
          email:
            profile.email || "No email provided",
          phone: profile.phone || "Not provided",
          role:
            profile.role === "business"
              ? "Business"
              : "Customer",
          status:
            profile.account_status === "active"
              ? "Active"
              : "Disabled",
          joined: formatDate(profile.created_at),
          businessName:
            businessNamesByOwner.get(profile.id),
          identityDocument:
            profile.role === "customer"
              ? identityByCustomer.get(profile.id)
              : undefined,
        })
      );

      setUsers(mappedUsers);
    } catch (error) {
      console.error("Unable to load users:", error);

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
                error instanceof Error
                  ? error.message
                  : "Unable to load the private ID image."
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
    setRejectionReason(
      user.identityDocument?.rejectionReason ?? ""
    );
    setSelectedUser(user);
  };

  const closeUserDetails = () => {
    if (isUpdatingStatus || isReviewingIdentity) {
      return;
    }

    setStatusError("");
    setVerificationError("");
    setSelectedUser(null);
  };

  const updateUserStatus = async (
    status: UserStatus
  ) => {
    if (!selectedUser) {
      return;
    }

    const actionLabel =
      status === "Active" ? "activate" : "disable";

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
        status === "Active" ? "active" : "suspended";

      const { error } = await supabase.rpc(
        "set_user_account_status",
        {
          requested_user_id: selectedUser.id,
          requested_status: databaseStatus,
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
    } catch (error) {
      console.error("Unable to update account:", error);

      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to update the account status."
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

    const actionLabel =
      nextStatus === "Verified" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} ${selectedUser.name}'s submitted ID?`
    );

    if (!confirmed) {
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
    } catch (error) {
      console.error(
        "Unable to review identity document:",
        error
      );

      setVerificationError(
        error instanceof Error
          ? error.message
          : "Unable to update the verification status."
      );
    } finally {
      setIsReviewingIdentity(false);
    }
  };

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
                        Retrieving accounts from Supabase.
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
                        <span className="identity-not-applicable">
                          Business review
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
                            void reviewIdentityDocument("Rejected")
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
                            void reviewIdentityDocument("Verified")
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
                    void updateUserStatus("Disabled")
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
                    void updateUserStatus("Active")
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

  return (
    <span className={`identity-verification-badge ${className}`}>
      {status === "Verified" && <CheckCircle2 size={13} />}
      {status === "Pending" && <Clock3 size={13} />}
      {status === "Rejected" && <XCircle size={13} />}
      {status === "Not Submitted" && <ImageIcon size={13} />}
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
      <div className="detail-card-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
