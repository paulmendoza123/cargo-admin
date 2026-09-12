import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Eye,
  ImageIcon,
  Loader2,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  loadAdminBusinesses,
  loadAdminBusinessStatusHistory,
  setAdminBusinessStatus,
} from "../lib/businesses";
import { useAdminPageSearch } from "../hooks/useAdminPageSearch";
import type {
  AdminBusiness,
  BusinessStatus,
  BusinessStatusHistoryEntry,
} from "../lib/businesses";
import "./Businesses.css";

const filters = ["All", "Active", "Suspended"] as const;
type Filter = (typeof filters)[number];

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function Businesses() {
  const [businesses, setBusinesses] =
    useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useAdminPageSearch();
  const [selectedFilter, setSelectedFilter] =
    useState<Filter>("All");
  const [selectedBusiness, setSelectedBusiness] =
    useState<AdminBusiness | null>(null);

  const [history, setHistory] =
    useState<BusinessStatusHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [statusAction, setStatusAction] =
    useState<BusinessStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadPage = useCallback(async (quiet = false) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError("");

    try {
      const nextBusinesses = await loadAdminBusinesses();
      setBusinesses(nextBusinesses);
      setSelectedBusiness((current) =>
        current
          ? nextBusinesses.find(
              (business) => business.id === current.id
            ) || null
          : null
      );
    } catch (error) {
      console.error("Unable to load businesses:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load businesses."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(async (businessId: string) => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      setHistory(
        await loadAdminBusinessStatusHistory(businessId)
      );
    } catch (error) {
      console.error(
        "Unable to load business status history:",
        error
      );
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Unable to load status history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadPage]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void loadPage(true);
    };

    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [loadPage]);

  const openBusiness = (business: AdminBusiness) => {
    setSelectedBusiness(business);
    setHistory([]);
    setStatusAction(null);
    setStatusReason("");
    setActionError("");
    void loadHistory(business.id);
  };

  const closeBusiness = () => {
    if (working) return;

    setSelectedBusiness(null);
    setHistory([]);
    setStatusAction(null);
    setStatusReason("");
    setActionError("");
  };

  const beginStatusAction = (status: BusinessStatus) => {
    setStatusAction(status);
    setStatusReason("");
    setActionError("");
  };

  const cancelStatusAction = () => {
    if (working) return;

    setStatusAction(null);
    setStatusReason("");
    setActionError("");
  };

  const confirmStatusAction = async () => {
    if (!selectedBusiness || !statusAction || working) return;

    const reason = statusReason.trim();

    if (statusAction === "Suspended" && reason.length < 8) {
      setActionError(
        "Enter a clear suspension reason with at least 8 characters."
      );
      return;
    }

    try {
      setWorking(true);
      setActionError("");

      await setAdminBusinessStatus(
        selectedBusiness.id,
        statusAction,
        reason
      );

      await Promise.all([
        loadPage(true),
        loadHistory(selectedBusiness.id),
      ]);

      setStatusAction(null);
      setStatusReason("");
      setNotice(
        statusAction === "Active"
          ? `${selectedBusiness.name} was reactivated.`
          : `${selectedBusiness.name} was suspended.`
      );
      window.setTimeout(() => setNotice(""), 4500);
      window.dispatchEvent(new Event("cargo:businesses-changed"));
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update the business status."
      );
    } finally {
      setWorking(false);
    }
  };

  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return businesses.filter((business) => {
      const matchesFilter =
        selectedFilter === "All" ||
        business.status === selectedFilter;
      const matchesSearch =
        !query ||
        [
          business.businessCode,
          business.name,
          business.representativeName,
          business.email,
          business.phone,
          business.address,
        ].some((value) => value.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });
  }, [businesses, search, selectedFilter]);

  const activeCount = businesses.filter(
    (business) => business.status === "Active"
  ).length;
  const suspendedCount = businesses.length - activeCount;

  return (
    <>
      {notice && <div className="business-notice">{notice}</div>}

      <div className="page-heading">
        <div>
          <p className="eyebrow">REGISTERED COMPANIES</p>
          <h2>Businesses</h2>
          <p className="page-description">
            Monitor live cargo businesses, services, and account status.
          </p>
        </div>

        <div className="business-heading-actions">
          <button
            type="button"
            className="business-refresh-button"
            onClick={() => void loadPage(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "spin" : ""}
            />
            Refresh data
          </button>

          <div className="business-header-badge">
            <BriefcaseBusiness size={17} />
            <span>{businesses.length} Registered</span>
          </div>
        </div>
      </div>

      <section className="business-stats">
        <BusinessStat
          title="Total Businesses"
          value={businesses.length}
          icon={<BriefcaseBusiness size={22} />}
          tone="blue"
        />
        <BusinessStat
          title="Active"
          value={activeCount}
          icon={<CheckCircle2 size={22} />}
          tone="green"
        />
        <BusinessStat
          title="Suspended"
          value={suspendedCount}
          icon={<PauseCircle size={22} />}
          tone="red"
        />
      </section>

      <section className="businesses-page-panel">
        <div className="businesses-toolbar">
          <div className="businesses-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search business, code, representative, or email..."
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}>
                <X size={17} />
              </button>
            )}
          </div>

          <div className="business-filters">
            {filters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={
                  selectedFilter === filter
                    ? "business-filter active"
                    : "business-filter"
                }
                onClick={() => setSelectedFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="business-result-bar">
          <div>
            <strong>{filteredBusinesses.length}</strong>
            <span>
              {filteredBusinesses.length === 1
                ? " business found"
                : " businesses found"}
            </span>
          </div>
          <span>Showing: {selectedFilter}</span>
        </div>

        {pageError && (
          <div className="business-page-message error">
            <AlertCircle size={22} />
            <div>
              <strong>Unable to load businesses</strong>
              <span>{pageError}</span>
            </div>
            <button type="button" onClick={() => void loadPage()}>
              Try again
            </button>
          </div>
        )}

        {!pageError && loading ? (
          <div className="business-page-message">
            <Loader2 size={26} className="spin" />
            <strong>Loading live business records...</strong>
          </div>
        ) : (
          <div className="business-table-wrap">
            <table className="business-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Representative</th>
                  <th>Destinations</th>
                  <th>Bookings</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredBusinesses.map((business) => (
                  <tr key={business.id}>
                    <td>
                      <div className="business-company-cell">
                        <BusinessLogo business={business} compact />
                        <div>
                          <strong>{business.name}</strong>
                          <span>{business.businessCode}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="business-contact-cell">
                        <strong>{business.representativeName}</strong>
                        <span>{business.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="business-destination-count">
                        <MapPin size={14} />
                        {business.destinationsCount}
                      </div>
                    </td>
                    <td>{business.bookingsCount}</td>
                    <td>
                      <BusinessStatusBadge status={business.status} />
                    </td>
                    <td className="business-action-cell">
                      <button
                        type="button"
                        className="view-business-button"
                        onClick={() => openBusiness(business)}
                      >
                        <Eye size={16} />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}

                {!pageError &&
                  !loading &&
                  filteredBusinesses.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="businesses-empty">
                          <BriefcaseBusiness size={34} />
                          <strong>No businesses found</strong>
                          <span>
                            {businesses.length === 0
                              ? "No approved business accounts exist yet."
                              : "Try changing your search or filter."}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBusiness && (
        <div className="web-modal-overlay">
          <div className="business-modal">
            <div className="application-modal-header">
              <div>
                <p className="eyebrow">REGISTERED BUSINESS</p>
                <h3>Business Details</h3>
                <span>{selectedBusiness.businessCode}</span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeBusiness}
                disabled={working}
                aria-label="Close business details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="application-modal-body">
              <div
                className={`business-detail-hero ${
                  selectedBusiness.coverUrl ? "has-cover" : ""
                }`}
                style={
                  selectedBusiness.coverUrl
                    ? {
                        backgroundImage: `linear-gradient(90deg, rgba(18, 59, 93, 0.96), rgba(18, 59, 93, 0.72)), url("${selectedBusiness.coverUrl}")`,
                      }
                    : undefined
                }
              >
                <BusinessLogo business={selectedBusiness} />
                <div className="business-hero-copy">
                  <h3>{selectedBusiness.name}</h3>
                  <p>{selectedBusiness.representativeName}</p>
                </div>
                <BusinessStatusBadge status={selectedBusiness.status} />
              </div>

              <div className="detail-grid">
                <BusinessDetailCard
                  icon={<Mail size={18} />}
                  label="Email Address"
                  value={selectedBusiness.email}
                />
                <BusinessDetailCard
                  icon={<Phone size={18} />}
                  label="Phone Number"
                  value={selectedBusiness.phone}
                />
                <BusinessDetailCard
                  icon={<MapPin size={18} />}
                  label="Business Address"
                  value={selectedBusiness.address}
                  wide
                />
              </div>

              <div className="application-detail-section">
                <h4>Description</h4>
                <div className="application-description-box">
                  {selectedBusiness.description}
                </div>
              </div>

              <TagSection
                title="Destinations"
                values={selectedBusiness.destinations}
                icon={<MapPin size={13} />}
                tone="blue-tag"
              />
              <TagSection
                title="Cargo Types"
                values={selectedBusiness.cargoTypes}
              />

              <div className="business-activity-grid">
                <div>
                  <strong>{selectedBusiness.bookingsCount}</strong>
                  <span>Bookings</span>
                </div>
                <div>
                  <strong>{selectedBusiness.ratesCount}</strong>
                  <span>Available Rates</span>
                </div>
                <div>
                  <strong>{selectedBusiness.galleryCount}</strong>
                  <span>Gallery Photos</span>
                </div>
                <div>
                  <strong>{formatDate(selectedBusiness.approvedAt)}</strong>
                  <span>Approved</span>
                </div>
              </div>

              <div className="business-history-section">
                <div className="business-section-heading">
                  <div>
                    <Clock3 size={17} />
                    <h4>Account status history</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadHistory(selectedBusiness.id)}
                    disabled={historyLoading}
                  >
                    <RefreshCw
                      size={13}
                      className={historyLoading ? "spin" : ""}
                    />
                    Refresh
                  </button>
                </div>

                {historyError ? (
                  <div className="business-history-empty error">
                    {historyError}
                  </div>
                ) : historyLoading ? (
                  <div className="business-history-empty">
                    Loading status history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="business-history-empty">
                    No administrative status changes yet.
                  </div>
                ) : (
                  <div className="business-history-list">
                    {history.map((entry) => (
                      <div className="business-history-item" key={entry.id}>
                        <span
                          className={`business-history-dot ${entry.newStatus.toLowerCase()}`}
                        />
                        <div>
                          <strong>
                            {entry.oldStatus
                              ? `${entry.oldStatus} → ${entry.newStatus}`
                              : entry.newStatus}
                          </strong>
                          <p>{entry.reason || "No reason provided."}</p>
                          <span>{formatDateTime(entry.changedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="business-permission-note">
                Account status changes are recorded in the audit history.
                Rates and services remain managed by the business owner.
              </div>

              {statusAction && (
                <div
                  className={`business-status-action ${statusAction.toLowerCase()}`}
                >
                  <div>
                    <strong>
                      {statusAction === "Suspended"
                        ? "Suspend this business?"
                        : "Reactivate this business?"}
                    </strong>
                    <span>
                      {statusAction === "Suspended"
                        ? "Suspended companies are immediately hidden from customer discovery and cannot receive new bookings."
                        : "The company becomes visible to customers and can receive new bookings again."}
                    </span>
                  </div>

                  <label htmlFor="business-status-reason">
                    {statusAction === "Suspended"
                      ? "Suspension reason"
                      : "Audit note (optional)"}
                  </label>
                  <textarea
                    id="business-status-reason"
                    value={statusReason}
                    onChange={(event) => {
                      setStatusReason(event.target.value);
                      setActionError("");
                    }}
                    maxLength={500}
                    placeholder={
                      statusAction === "Suspended"
                        ? "Explain why the account is being suspended..."
                        : "Add an optional note for the audit history..."
                    }
                  />
                  <div className="business-reason-meta">
                    <span>{statusReason.length}/500</span>
                    {statusAction === "Suspended" && (
                      <span>Minimum 8 characters</span>
                    )}
                  </div>
                  {actionError && (
                    <div className="business-action-error">
                      <AlertCircle size={15} />
                      {actionError}
                    </div>
                  )}
                  <div className="business-action-buttons">
                    <button
                      type="button"
                      className="business-action-cancel"
                      onClick={cancelStatusAction}
                      disabled={working}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={
                        statusAction === "Suspended"
                          ? "suspend-business-button"
                          : "reactivate-business-button"
                      }
                      onClick={() => void confirmStatusAction()}
                      disabled={
                        working ||
                        (statusAction === "Suspended" &&
                          statusReason.trim().length < 8)
                      }
                    >
                      {working ? (
                        <Loader2 size={17} className="spin" />
                      ) : statusAction === "Suspended" ? (
                        <PauseCircle size={17} />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                      {working
                        ? "Saving..."
                        : statusAction === "Suspended"
                          ? "Confirm suspension"
                          : "Confirm reactivation"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="application-modal-footer">
              {!statusAction &&
                (selectedBusiness.status === "Active" ? (
                  <button
                    type="button"
                    className="suspend-business-button"
                    onClick={() => beginStatusAction("Suspended")}
                  >
                    <PauseCircle size={18} />
                    Suspend Business
                  </button>
                ) : (
                  <button
                    type="button"
                    className="reactivate-business-button"
                    onClick={() => beginStatusAction("Active")}
                  >
                    <CheckCircle2 size={18} />
                    Reactivate Business
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BusinessLogo({
  business,
  compact = false,
}: {
  business: AdminBusiness;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact ? "business-table-logo" : "business-detail-logo"
      }
    >
      {business.logoUrl ? (
        <img src={business.logoUrl} alt={`${business.name} logo`} />
      ) : (
        <BriefcaseBusiness size={compact ? 20 : 28} />
      )}
    </div>
  );
}

function BusinessStat({
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
    <div className="business-stat-card">
      <div className={`application-stat-icon ${tone}`}>{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{title}</span>
      </div>
    </div>
  );
}

function BusinessStatusBadge({ status }: { status: BusinessStatus }) {
  return (
    <span className={`business-status ${status.toLowerCase()}`}>
      <span />
      {status}
    </span>
  );
}

function BusinessDetailCard({
  icon,
  label,
  value,
  wide,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`detail-card ${wide ? "wide" : ""}`}>
      <div className="detail-card-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TagSection({
  title,
  values,
  icon,
  tone = "",
}: {
  title: string;
  values: string[];
  icon?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="application-detail-section">
      <h4>{title}</h4>
      <div className="application-tags">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              className={`application-tag ${tone}`.trim()}
              key={value}
            >
              {icon}
              {value}
            </span>
          ))
        ) : (
          <span className={`application-tag ${tone}`.trim()}>
            <ImageIcon size={13} />
            Not configured yet
          </span>
        )}
      </div>
    </div>
  );
}
