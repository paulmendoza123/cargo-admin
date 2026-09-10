import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileImage,
  Loader2,
  Mail,
  Megaphone,
  PackageOpen,
  Pencil,
  Phone,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  approveSponsorshipRequest,
  createPaymentProofUrl,
  loadAdminSponsorshipCheckout,
  loadAdminSponsorshipPackages,
  loadAdminSponsorshipRequests,
  rejectSponsorshipRequest,
  saveSponsorshipCheckout,
  saveSponsorshipPackage,
  setSponsoredPlacementEnabled,
} from "../lib/sponsorships";
import { useAdminPageSearch } from "../hooks/useAdminPageSearch";
import type {
  AdminSponsorshipRequest,
  SponsorshipCheckout,
  SponsorshipDisplayStatus,
  SponsorshipPackage,
} from "../lib/sponsorships";
import "./Sponsored.css";

type PageTab = "requests" | "settings";
type RequestFilter = "All" | SponsorshipDisplayStatus;

type PackageForm = {
  name: string;
  durationDays: string;
  price: string;
  description: string;
  isActive: boolean;
};

type CheckoutForm = {
  accountName: string;
  accountNumber: string;
  instructions: string;
  isEnabled: boolean;
};

const EMPTY_CHECKOUT: CheckoutForm = {
  accountName: "",
  accountNumber: "",
  instructions: "",
  isEnabled: false,
};

const FILTERS: RequestFilter[] = [
  "All",
  "Pending",
  "Active",
  "Scheduled",
  "Disabled",
  "Expired",
  "Rejected",
  "Cancelled",
];

function formatDateTime(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function receiptName(storagePath: string) {
  const value =
    storagePath.split("/").at(-1) ||
    "Payment receipt";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function statusTone(status: SponsorshipDisplayStatus) {
  if (status === "Active") {
    return "success";
  }

  if (status === "Pending" || status === "Scheduled") {
    return "warning";
  }

  if (status === "Rejected" || status === "Cancelled") {
    return "danger";
  }

  if (status === "Disabled" || status === "Expired") {
    return "muted";
  }

  return "info";
}

function checkoutToForm(
  checkout: SponsorshipCheckout | null
): CheckoutForm {
  if (!checkout) {
    return EMPTY_CHECKOUT;
  }

  return {
    accountName: checkout.accountName,
    accountNumber: checkout.accountNumber,
    instructions: checkout.instructions,
    isEnabled: checkout.isEnabled,
  };
}

export default function Sponsored() {
  const [tab, setTab] =
    useState<PageTab>("requests");
  const [requests, setRequests] =
    useState<AdminSponsorshipRequest[]>([]);
  const [packages, setPackages] =
    useState<SponsorshipPackage[]>([]);
  const [checkout, setCheckout] =
    useState<SponsorshipCheckout | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [working, setWorking] =
    useState(false);
  const [pageError, setPageError] =
    useState("");
  const [notice, setNotice] =
    useState("");

  const [search, setSearch] =
    useAdminPageSearch();
  const [filter, setFilter] =
    useState<RequestFilter>("All");
  const [selectedId, setSelectedId] =
    useState<string | null>(null);
  const [paymentReviewed, setPaymentReviewed] =
    useState(false);

  const [rejectVisible, setRejectVisible] =
    useState(false);
  const [rejectionReason, setRejectionReason] =
    useState("");

  const [editingPackageId, setEditingPackageId] =
    useState<string | null>(null);
  const [packageForm, setPackageForm] =
    useState<PackageForm | null>(null);

  const [checkoutForm, setCheckoutForm] =
    useState<CheckoutForm>(EMPTY_CHECKOUT);
  const [showAccountNumber, setShowAccountNumber] =
    useState(false);

  const publishChange = useCallback(() => {
    window.dispatchEvent(
      new Event("cargo:sponsorships-changed")
    );
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [
        nextRequests,
        nextPackages,
        nextCheckout,
      ] = await Promise.all([
        loadAdminSponsorshipRequests(),
        loadAdminSponsorshipPackages(),
        loadAdminSponsorshipCheckout(),
      ]);

      setRequests(nextRequests);
      setPackages(nextPackages);
      setCheckout(nextCheckout);
      setCheckoutForm(
        checkoutToForm(nextCheckout)
      );
      publishChange();
    } catch (error) {
      console.error(
        "Unable to load sponsorship management:",
        error
      );
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load sponsorship management."
      );
    } finally {
      setLoading(false);
    }
  }, [publishChange]);

  const refreshRequests =
    useCallback(async () => {
      const nextRequests =
        await loadAdminSponsorshipRequests();
      setRequests(nextRequests);
      publishChange();
    }, [publishChange]);

  useEffect(() => {
    const initialLoad =
      window.setTimeout(
        () => {
          void loadPage();
        },
        0
      );

    return () => {
      window.clearTimeout(
        initialLoad
      );
    };
  }, [loadPage]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void loadPage();
    };

    window.addEventListener(
      "focus",
      refreshOnFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshOnFocus
      );
    };
  }, [loadPage]);

  const openRequest = (
    requestId: string
  ) => {
    setSelectedId(requestId);
    setPaymentReviewed(false);
    setRejectVisible(false);
    setRejectionReason("");
  };

  const closeRequest = () => {
    setSelectedId(null);
    setPaymentReviewed(false);
    setRejectVisible(false);
    setRejectionReason("");
  };

  const selectedRequest =
    useMemo(
      () =>
        requests.find(
          (request) =>
            request.id === selectedId
        ),
      [requests, selectedId]
    );

  const filteredRequests =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return requests.filter(
        (request) => {
          const matchesFilter =
            filter === "All" ||
            request.status === filter;
          const matchesSearch =
            !query ||
            [
              request.requestCode,
              request.businessName,
              request.representativeName,
              request.businessEmail,
              request.businessPhone,
              request.packageName,
              request.paymentReference,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query)
            );

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [filter, requests, search]);

  const counts = useMemo(() => {
    const count = (
      status: SponsorshipDisplayStatus
    ) =>
      requests.filter(
        (request) =>
          request.status === status
      ).length;

    return {
      all: requests.length,
      pending: count("Pending"),
      active: count("Active"),
      scheduled: count("Scheduled"),
      disabled: count("Disabled"),
      expired: count("Expired"),
      rejected: count("Rejected"),
      cancelled: count("Cancelled"),
    };
  }, [requests]);

  const filterCount = (
    value: RequestFilter
  ) => {
    if (value === "All") return counts.all;
    if (value === "Pending")
      return counts.pending;
    if (value === "Active")
      return counts.active;
    if (value === "Scheduled")
      return counts.scheduled;
    if (value === "Disabled")
      return counts.disabled;
    if (value === "Expired")
      return counts.expired;
    if (value === "Rejected")
      return counts.rejected;
    return counts.cancelled;
  };

  const showNotice = (
    message: string
  ) => {
    setNotice(message);
    window.setTimeout(
      () => setNotice(""),
      4500
    );
  };

  const openReceipt = async (
    request: AdminSponsorshipRequest
  ) => {
    const receiptWindow =
      window.open(
        "about:blank",
        "_blank"
      );

    if (receiptWindow) {
      receiptWindow.opener = null;
      receiptWindow.document.title =
        "Loading payment receipt...";
    }

    try {
      setWorking(true);
      const url =
        await createPaymentProofUrl(
          request.paymentProofPath
        );

      if (receiptWindow) {
        receiptWindow.location.replace(
          url
        );
      } else {
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch (error) {
      receiptWindow?.close();
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to open the payment receipt."
      );
    } finally {
      setWorking(false);
    }
  };

  const approveSelected = async () => {
    if (
      !selectedRequest ||
      selectedRequest.status !==
        "Pending" ||
      working
    ) {
      return;
    }

    if (!paymentReviewed) {
      window.alert(
        "Review the payment receipt and confirm the checklist first."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Approve ${selectedRequest.requestCode} for ${selectedRequest.businessName}?\n\nThe ${selectedRequest.durationDays}-day sponsored placement starts after approval.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setWorking(true);
      await approveSponsorshipRequest(
        selectedRequest.id
      );
      await refreshRequests();
      showNotice(
        "Sponsorship approved and placement activated."
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to approve the sponsorship request."
      );
    } finally {
      setWorking(false);
    }
  };

  const confirmReject = async () => {
    if (
      !selectedRequest ||
      selectedRequest.status !==
        "Pending" ||
      working
    ) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (reason.length < 8) {
      window.alert(
        "Enter a clear rejection reason with at least 8 characters."
      );
      return;
    }

    try {
      setWorking(true);
      await rejectSponsorshipRequest(
        selectedRequest.id,
        reason
      );
      await refreshRequests();
      setRejectVisible(false);
      setRejectionReason("");
      showNotice(
        "Sponsorship request rejected. The business can see the reason."
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to reject the sponsorship request."
      );
    } finally {
      setWorking(false);
    }
  };

  const togglePlacement = async (
    request: AdminSponsorshipRequest
  ) => {
    if (
      !request.placementId ||
      working
    ) {
      return;
    }

    const nextEnabled =
      !request.placementIsEnabled;
    const confirmed =
      window.confirm(
        `${nextEnabled ? "Enable" : "Disable"} the sponsored placement for ${request.businessName}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setWorking(true);
      await setSponsoredPlacementEnabled(
        request.placementId,
        nextEnabled
      );
      await refreshRequests();
      showNotice(
        `Sponsored placement ${nextEnabled ? "enabled" : "disabled"}.`
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update the sponsored placement."
      );
    } finally {
      setWorking(false);
    }
  };

  const startPackageEdit = (
    item: SponsorshipPackage
  ) => {
    setEditingPackageId(item.id);
    setPackageForm({
      name: item.name,
      durationDays:
        String(item.durationDays),
      price: String(item.price),
      description: item.description,
      isActive: item.isActive,
    });
  };

  const submitPackage = async () => {
    if (
      !editingPackageId ||
      !packageForm ||
      working
    ) {
      return;
    }

    const durationDays =
      Number(packageForm.durationDays);
    const price =
      Number(packageForm.price);

    if (
      packageForm.name
        .trim().length < 3
    ) {
      window.alert(
        "Package name must contain at least 3 characters."
      );
      return;
    }

    if (
      !Number.isInteger(
        durationDays
      ) ||
      durationDays < 1 ||
      durationDays > 365
    ) {
      window.alert(
        "Duration must be a whole number between 1 and 365 days."
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      window.alert(
        "Enter a valid package price."
      );
      return;
    }

    try {
      setWorking(true);
      await saveSponsorshipPackage({
        id: editingPackageId,
        name: packageForm.name,
        durationDays,
        price,
        description:
          packageForm.description,
        isActive:
          packageForm.isActive,
      });
      const nextPackages =
        await loadAdminSponsorshipPackages();
      setPackages(nextPackages);
      setEditingPackageId(null);
      setPackageForm(null);
      showNotice(
        "Sponsorship package updated. New requests will use the new values."
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save the sponsorship package."
      );
    } finally {
      setWorking(false);
    }
  };

  const submitCheckout = async () => {
    if (working) {
      return;
    }

    if (
      checkoutForm.accountName
        .trim().length < 2
    ) {
      window.alert(
        "Enter a valid GCash account name."
      );
      return;
    }

    const digits =
      checkoutForm.accountNumber.replace(
        /\D/g,
        ""
      );

    if (
      digits.length < 7 ||
      digits.length > 15
    ) {
      window.alert(
        "Enter a valid GCash account number."
      );
      return;
    }

    try {
      setWorking(true);
      await saveSponsorshipCheckout(
        checkoutForm
      );
      const nextCheckout =
        await loadAdminSponsorshipCheckout();
      setCheckout(nextCheckout);
      setCheckoutForm(
        checkoutToForm(nextCheckout)
      );
      showNotice(
        "GCash checkout settings saved successfully."
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save the sponsorship checkout."
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="sa-page">
      <div className="sa-heading">
        <div>
          <p className="sa-eyebrow">
            REVENUE MANAGEMENT
          </p>
          <h1>Sponsored Listings</h1>
          <p>
            Review payment proofs,
            manage placements, and
            configure sponsorship
            packages.
          </p>
        </div>

        <button
          type="button"
          className="sa-refresh"
          onClick={() =>
            void loadPage()
          }
          disabled={
            loading || working
          }
        >
          <RefreshCw
            size={17}
            className={
              loading ? "sa-spin" : ""
            }
          />
          {loading
            ? "Loading"
            : "Refresh data"}
        </button>
      </div>

      {notice && (
        <div
          className="sa-notice sa-notice--success"
          role="status"
        >
          <CheckCircle2 size={19} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() =>
              setNotice("")
            }
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {pageError && (
        <div
          className="sa-notice sa-notice--error"
          role="alert"
        >
          <AlertCircle size={20} />
          <div>
            <strong>
              Unable to load live
              sponsorship data
            </strong>
            <span>{pageError}</span>
            <small>
              Run{" "}
              <code>
                supabase/admin-sponsorship-workflow.sql
              </code>{" "}
              in the same Supabase
              project, then refresh.
            </small>
          </div>
        </div>
      )}

      <div
        className="sa-tabs"
        role="tablist"
        aria-label="Sponsorship management"
      >
        <button
          type="button"
          className={
            tab === "requests"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("requests")
          }
          role="tab"
          aria-selected={
            tab === "requests"
          }
        >
          <ReceiptText size={17} />
          Requests
          {counts.pending > 0 && (
            <span>
              {counts.pending}
            </span>
          )}
        </button>
        <button
          type="button"
          className={
            tab === "settings"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("settings")
          }
          role="tab"
          aria-selected={
            tab === "settings"
          }
        >
          <Settings2 size={17} />
          Packages & payment
        </button>
      </div>

      {tab === "requests" ? (
        <>
          <section
            className="sa-stats"
            aria-label="Sponsorship summary"
          >
            <SummaryCard
              label="Total requests"
              value={counts.all}
              helper="All submitted requests"
              icon={
                <Megaphone size={20} />
              }
              tone="blue"
            />
            <SummaryCard
              label="Waiting for review"
              value={counts.pending}
              helper="Payment verification needed"
              icon={
                <Clock3 size={20} />
              }
              tone="gold"
            />
            <SummaryCard
              label="Active sponsored"
              value={counts.active}
              helper="Currently promoted"
              icon={
                <Sparkles size={20} />
              }
              tone="green"
            />
            <SummaryCard
              label="Ended or rejected"
              value={
                counts.expired +
                counts.rejected +
                counts.cancelled
              }
              helper="Inactive requests"
              icon={<Ban size={20} />}
              tone="gray"
            />
          </section>

          <section className="sa-panel">
            <div className="sa-panel-header">
              <div>
                <h2>
                  Sponsorship requests
                </h2>
                <p>
                  Live records submitted
                  from the CargoTrackPH
                  business app.
                </p>
              </div>
              <span className="sa-result-count">
                {
                  filteredRequests.length
                }{" "}
                result
                {filteredRequests.length ===
                1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="sa-toolbar">
              <label className="sa-search">
                <Search size={18} />
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search business, request, or reference..."
                  aria-label="Search sponsorship requests"
                />
              </label>

              <div
                className="sa-filters"
                aria-label="Filter sponsorship requests"
              >
                {FILTERS.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={
                      filter === item
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setFilter(item)
                    }
                  >
                    {item}
                    <span>
                      {
                        filterCount(
                          item
                        )
                      }
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <LoadingState label="Loading sponsorship requests..." />
            ) : filteredRequests.length ===
              0 ? (
              <EmptyState
                title={
                  requests.length === 0
                    ? "No sponsorship requests yet"
                    : "No matching requests"
                }
                description={
                  requests.length === 0
                    ? "New requests from businesses will appear here automatically."
                    : "Try another search term or status filter."
                }
              />
            ) : (
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Package</th>
                      <th>Requested</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map(
                      (request) => (
                        <tr key={request.id}>
                          <td>
                            <div className="sa-company-cell">
                              <span>
                                <Building2
                                  size={
                                    18
                                  }
                                />
                              </span>
                              <div>
                                <strong>
                                  {
                                    request.businessName
                                  }
                                </strong>
                                <small>
                                  {
                                    request.requestCode
                                  }
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong className="sa-table-primary">
                              {
                                request.packageName
                              }
                            </strong>
                            <small className="sa-table-secondary">
                              {
                                request.durationDays
                              }{" "}
                              days
                            </small>
                          </td>
                          <td>
                            {formatDateTime(
                              request.requestedAt
                            )}
                          </td>
                          <td>
                            <strong className="sa-price">
                              {formatPeso(
                                request.price
                              )}
                            </strong>
                          </td>
                          <td>
                            <StatusBadge
                              status={
                                request.status
                              }
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="sa-view-button"
                              onClick={() =>
                                openRequest(
                                  request.id
                                )
                              }
                            >
                              <Eye
                                size={
                                  16
                                }
                              />
                              Review
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="sa-settings-layout">
          <div className="sa-panel sa-packages-panel">
            <div className="sa-panel-header">
              <div>
                <h2>
                  Sponsorship packages
                </h2>
                <p>
                  Edit the offers shown
                  to business owners in
                  the mobile app.
                </p>
              </div>
              <span className="sa-result-count">
                {packages.length} packages
              </span>
            </div>

            <div className="sa-package-grid">
              {packages.map((item) => (
                <article
                  className="sa-package-card"
                  key={item.id}
                >
                  <div className="sa-package-card-top">
                    <span className="sa-package-icon">
                      <PackageOpen
                        size={20}
                      />
                    </span>
                    <span
                      className={`sa-availability ${item.isActive ? "active" : "inactive"}`}
                    >
                      {item.isActive
                        ? "Visible in app"
                        : "Hidden from app"}
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                  <div className="sa-package-price">
                    {formatPeso(
                      item.price
                    )}
                  </div>
                  <p>
                    {item.description ||
                      "No package description."}
                  </p>
                  <div className="sa-package-meta">
                    <CalendarDays
                      size={15}
                    />
                    {item.durationDays} days
                    after approval
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      startPackageEdit(
                        item
                      )
                    }
                  >
                    <Pencil size={15} />
                    Edit package
                  </button>
                </article>
              ))}
            </div>

            <div className="sa-info-note">
              <BadgeCheck size={18} />
              <span>
                Package changes apply
                only to new requests.
                Existing requests keep
                their submitted price
                and duration snapshots.
              </span>
            </div>
          </div>

          <div className="sa-panel sa-checkout-panel">
            <div className="sa-panel-header">
              <div>
                <h2>GCash checkout</h2>
                <p>
                  Payment details
                  displayed during
                  sponsorship submission.
                </p>
              </div>
              <span
                className={`sa-availability ${checkoutForm.isEnabled ? "active" : "inactive"}`}
              >
                {checkoutForm.isEnabled
                  ? "Enabled"
                  : "Disabled"}
              </span>
            </div>

            <div className="sa-form-grid">
              <label>
                <span>
                  Payment method
                </span>
                <div className="sa-readonly-field">
                  <CreditCard size={16} />
                  GCash
                </div>
              </label>
              <label>
                <span>Account name</span>
                <input
                  value={
                    checkoutForm.accountName
                  }
                  onChange={(event) =>
                    setCheckoutForm(
                      (current) => ({
                        ...current,
                        accountName:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Official account name"
                  maxLength={100}
                />
              </label>
              <label className="sa-form-wide">
                <span>
                  Account number
                </span>
                <div className="sa-secret-field">
                  <input
                    type={
                      showAccountNumber
                        ? "text"
                        : "password"
                    }
                    value={
                      checkoutForm.accountNumber
                    }
                    onChange={(event) =>
                      setCheckoutForm(
                        (current) => ({
                          ...current,
                          accountNumber:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Official GCash number"
                    inputMode="tel"
                    maxLength={24}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowAccountNumber(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showAccountNumber
                        ? "Hide account number"
                        : "Show account number"
                    }
                  >
                    {showAccountNumber ? (
                      <EyeOff
                        size={17}
                      />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>
              <label className="sa-form-wide">
                <span>
                  Payment instructions
                </span>
                <textarea
                  value={
                    checkoutForm.instructions
                  }
                  onChange={(event) =>
                    setCheckoutForm(
                      (current) => ({
                        ...current,
                        instructions:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Instructions shown to business owners"
                  maxLength={500}
                  rows={4}
                />
                <small>
                  {
                    checkoutForm
                      .instructions
                      .length
                  }
                  /500 characters
                </small>
              </label>
            </div>

            <label className="sa-switch-row">
              <input
                type="checkbox"
                checked={
                  checkoutForm.isEnabled
                }
                onChange={(event) =>
                  setCheckoutForm(
                    (current) => ({
                      ...current,
                      isEnabled:
                        event.target
                          .checked,
                    })
                  )
                }
              />
              <span
                className="sa-switch"
                aria-hidden="true"
              />
              <div>
                <strong>
                  Accept sponsorship
                  submissions
                </strong>
                <small>
                  When disabled,
                  businesses cannot submit
                  new payment proofs.
                </small>
              </div>
            </label>

            <button
              type="button"
              className="sa-primary-button sa-save-checkout"
              onClick={() =>
                void submitCheckout()
              }
              disabled={working}
            >
              {working ? (
                <Loader2
                  size={17}
                  className="sa-spin"
                />
              ) : (
                <Save size={17} />
              )}
              Save checkout settings
            </button>

            {checkout && (
              <small className="sa-last-updated">
                Last updated{" "}
                {formatDateTime(
                  checkout.updatedAt
                )}
              </small>
            )}
          </div>
        </section>
      )}

      {selectedRequest && (
        <div
          className="sa-modal-overlay"
          role="presentation"
          onMouseDown={closeRequest}
        >
          <section
            className="sa-modal sa-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsorship-review-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header className="sa-modal-header">
              <div className="sa-modal-title-row">
                <span className="sa-modal-icon">
                  <Megaphone
                    size={21}
                  />
                </span>
                <div>
                  <p>
                    {
                      selectedRequest.requestCode
                    }
                  </p>
                  <h2 id="sponsorship-review-title">
                    {
                      selectedRequest.businessName
                    }
                  </h2>
                </div>
              </div>
              <button
                type="button"
                className="sa-close"
                onClick={closeRequest}
                aria-label="Close review"
              >
                <X size={20} />
              </button>
            </header>

            <div className="sa-modal-status-row">
              <StatusBadge
                status={
                  selectedRequest.status
                }
              />
              <span>
                Requested{" "}
                {formatDateTime(
                  selectedRequest.requestedAt
                )}
              </span>
            </div>

            <div className="sa-detail-grid">
              <DetailCard
                title="Business account"
                icon={
                  <Building2 size={17} />
                }
              >
                <DetailLine
                  icon={
                    <UserRound
                      size={15}
                    />
                  }
                  label="Representative"
                  value={
                    selectedRequest.representativeName
                  }
                />
                <DetailLine
                  icon={<Mail size={15} />}
                  label="Email"
                  value={
                    selectedRequest.businessEmail
                  }
                />
                <DetailLine
                  icon={
                    <Phone size={15} />
                  }
                  label="Phone"
                  value={
                    selectedRequest.businessPhone
                  }
                />
              </DetailCard>

              <DetailCard
                title="Requested package"
                icon={
                  <PackageOpen
                    size={17}
                  />
                }
              >
                <DetailLine
                  label="Package"
                  value={
                    selectedRequest.packageName
                  }
                />
                <DetailLine
                  label="Duration"
                  value={`${selectedRequest.durationDays} days`}
                />
                <DetailLine
                  label="Amount"
                  value={formatPeso(
                    selectedRequest.price
                  )}
                  emphasis
                />
              </DetailCard>

              <DetailCard
                title="Payment details"
                icon={
                  <CreditCard
                    size={17}
                  />
                }
              >
                <DetailLine
                  label="Method"
                  value={
                    selectedRequest.paymentMethod
                  }
                />
                <DetailLine
                  label="Reference"
                  value={
                    selectedRequest.paymentReference
                  }
                  mono
                />
                <button
                  type="button"
                  className="sa-proof-button"
                  onClick={() =>
                    void openReceipt(
                      selectedRequest
                    )
                  }
                  disabled={working}
                >
                  <FileImage
                    size={17}
                  />
                  <span>
                    <strong>
                      Open payment receipt
                    </strong>
                    <small>
                      {receiptName(
                        selectedRequest.paymentProofPath
                      )}
                    </small>
                  </span>
                  <Eye size={16} />
                </button>
              </DetailCard>

              <DetailCard
                title="Placement timeline"
                icon={
                  <CalendarDays
                    size={17}
                  />
                }
              >
                <DetailLine
                  label="Reviewed"
                  value={formatDateTime(
                    selectedRequest.reviewedAt
                  )}
                />
                <DetailLine
                  label="Starts"
                  value={formatDateTime(
                    selectedRequest.startsAt
                  )}
                />
                <DetailLine
                  label="Ends"
                  value={formatDateTime(
                    selectedRequest.endsAt
                  )}
                />
              </DetailCard>
            </div>

            {selectedRequest.rejectionReason && (
              <div className="sa-rejection-note">
                <XCircle size={18} />
                <div>
                  <strong>
                    Rejection reason
                  </strong>
                  <span>
                    {
                      selectedRequest.rejectionReason
                    }
                  </span>
                </div>
              </div>
            )}

            {selectedRequest.status ===
              "Pending" && (
              <label className="sa-review-check">
                <input
                  type="checkbox"
                  checked={
                    paymentReviewed
                  }
                  onChange={(event) =>
                    setPaymentReviewed(
                      event.target
                        .checked
                    )
                  }
                />
                <span>
                  <BadgeCheck
                    size={18}
                  />
                </span>
                <div>
                  <strong>
                    I reviewed the receipt
                    and transaction
                    reference
                  </strong>
                  <small>
                    Approval activates the
                    sponsored placement
                    immediately.
                  </small>
                </div>
              </label>
            )}

            {selectedRequest.placementId &&
              selectedRequest.status !==
                "Expired" && (
                <div className="sa-placement-control">
                  <div>
                    <strong>
                      Sponsored placement
                    </strong>
                    <span>
                      {selectedRequest.placementIsEnabled
                        ? "Enabled and eligible for customer visibility"
                        : "Disabled and hidden from sponsored results"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={
                      selectedRequest.placementIsEnabled
                        ? "enabled"
                        : "disabled"
                    }
                    onClick={() =>
                      void togglePlacement(
                        selectedRequest
                      )
                    }
                    disabled={working}
                  >
                    {selectedRequest.placementIsEnabled
                      ? "Disable"
                      : "Enable"}
                  </button>
                </div>
              )}

            <footer className="sa-modal-actions">
              <button
                type="button"
                className="sa-secondary-button"
                onClick={closeRequest}
              >
                Close
              </button>
              {selectedRequest.status ===
                "Pending" && (
                <>
                  <button
                    type="button"
                    className="sa-danger-button"
                    onClick={() =>
                      setRejectVisible(
                        true
                      )
                    }
                    disabled={working}
                  >
                    <XCircle
                      size={17}
                    />
                    Reject
                  </button>
                  <button
                    type="button"
                    className="sa-primary-button"
                    onClick={() =>
                      void approveSelected()
                    }
                    disabled={
                      !paymentReviewed ||
                      working
                    }
                  >
                    {working ? (
                      <Loader2
                        size={17}
                        className="sa-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={17}
                      />
                    )}
                    Approve & activate
                  </button>
                </>
              )}
            </footer>
          </section>
        </div>
      )}

      {rejectVisible &&
        selectedRequest && (
          <div
            className="sa-modal-overlay sa-modal-overlay--top"
            role="presentation"
          >
            <section
              className="sa-modal sa-small-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-title"
            >
              <header className="sa-modal-header">
                <div className="sa-modal-title-row">
                  <span className="sa-modal-icon sa-modal-icon--danger">
                    <XCircle
                      size={21}
                    />
                  </span>
                  <div>
                    <p>
                      {
                        selectedRequest.requestCode
                      }
                    </p>
                    <h2 id="reject-title">
                      Reject sponsorship
                      request
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  className="sa-close"
                  onClick={() =>
                    setRejectVisible(
                      false
                    )
                  }
                  aria-label="Close rejection form"
                >
                  <X size={20} />
                </button>
              </header>
              <div className="sa-small-modal-body">
                <p>
                  Give the business a
                  clear reason so they
                  know what to correct.
                </p>
                <label>
                  <span>
                    Rejection reason
                  </span>
                  <textarea
                    value={
                      rejectionReason
                    }
                    onChange={(event) =>
                      setRejectionReason(
                        event.target
                          .value
                      )
                    }
                    placeholder="Example: The uploaded receipt is unclear or the reference does not match."
                    rows={5}
                    maxLength={500}
                    autoFocus
                  />
                  <small>
                    {
                      rejectionReason.length
                    }
                    /500 characters
                  </small>
                </label>
              </div>
              <footer className="sa-modal-actions">
                <button
                  type="button"
                  className="sa-secondary-button"
                  onClick={() =>
                    setRejectVisible(
                      false
                    )
                  }
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="sa-danger-button sa-danger-button--solid"
                  onClick={() =>
                    void confirmReject()
                  }
                  disabled={working}
                >
                  {working ? (
                    <Loader2
                      size={17}
                      className="sa-spin"
                    />
                  ) : (
                    <XCircle
                      size={17}
                    />
                  )}
                  Confirm rejection
                </button>
              </footer>
            </section>
          </div>
        )}

      {editingPackageId &&
        packageForm && (
          <div
            className="sa-modal-overlay sa-modal-overlay--top"
            role="presentation"
            onMouseDown={() =>
              setEditingPackageId(
                null
              )
            }
          >
            <section
              className="sa-modal sa-small-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="package-edit-title"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <header className="sa-modal-header">
                <div className="sa-modal-title-row">
                  <span className="sa-modal-icon">
                    <Pencil
                      size={20}
                    />
                  </span>
                  <div>
                    <p>
                      PACKAGE SETTINGS
                    </p>
                    <h2 id="package-edit-title">
                      Edit sponsorship
                      package
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  className="sa-close"
                  onClick={() =>
                    setEditingPackageId(
                      null
                    )
                  }
                  aria-label="Close package editor"
                >
                  <X size={20} />
                </button>
              </header>
              <div className="sa-small-modal-body sa-form-grid">
                <label className="sa-form-wide">
                  <span>
                    Package name
                  </span>
                  <input
                    value={
                      packageForm.name
                    }
                    onChange={(event) =>
                      setPackageForm(
                        (current) =>
                          current
                            ? {
                                ...current,
                                name:
                                  event
                                    .target
                                    .value,
                              }
                            : current
                      )
                    }
                    maxLength={80}
                  />
                </label>
                <label>
                  <span>
                    Duration (days)
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    value={
                      packageForm.durationDays
                    }
                    onChange={(event) =>
                      setPackageForm(
                        (current) =>
                          current
                            ? {
                                ...current,
                                durationDays:
                                  event
                                    .target
                                    .value,
                              }
                            : current
                      )
                    }
                  />
                </label>
                <label>
                  <span>
                    Price (PHP)
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    step="0.01"
                    value={
                      packageForm.price
                    }
                    onChange={(event) =>
                      setPackageForm(
                        (current) =>
                          current
                            ? {
                                ...current,
                                price:
                                  event
                                    .target
                                    .value,
                              }
                            : current
                      )
                    }
                  />
                </label>
                <label className="sa-form-wide">
                  <span>
                    Description
                  </span>
                  <textarea
                    value={
                      packageForm.description
                    }
                    onChange={(event) =>
                      setPackageForm(
                        (current) =>
                          current
                            ? {
                                ...current,
                                description:
                                  event
                                    .target
                                    .value,
                              }
                            : current
                      )
                    }
                    rows={4}
                    maxLength={500}
                  />
                </label>
                <label className="sa-switch-row sa-form-wide">
                  <input
                    type="checkbox"
                    checked={
                      packageForm.isActive
                    }
                    onChange={(event) =>
                      setPackageForm(
                        (current) =>
                          current
                            ? {
                                ...current,
                                isActive:
                                  event
                                    .target
                                    .checked,
                              }
                            : current
                      )
                    }
                  />
                  <span
                    className="sa-switch"
                    aria-hidden="true"
                  />
                  <div>
                    <strong>
                      Visible in the
                      business app
                    </strong>
                    <small>
                      Inactive packages
                      remain in history
                      but cannot be
                      selected.
                    </small>
                  </div>
                </label>
              </div>
              <footer className="sa-modal-actions">
                <button
                  type="button"
                  className="sa-secondary-button"
                  onClick={() =>
                    setEditingPackageId(
                      null
                    )
                  }
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="sa-primary-button"
                  onClick={() =>
                    void submitPackage()
                  }
                  disabled={working}
                >
                  {working ? (
                    <Loader2
                      size={17}
                      className="sa-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}
                  Save package
                </button>
              </footer>
            </section>
          </div>
        )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
  tone: "blue" | "gold" | "green" | "gray";
}) {
  return (
    <article className="sa-summary-card">
      <div
        className={`sa-summary-icon sa-summary-icon--${tone}`}
      >
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: SponsorshipDisplayStatus;
}) {
  const tone =
    statusTone(status);

  return (
    <span
      className={`sa-status sa-status--${tone}`}
    >
      {status === "Active" ? (
        <CheckCircle2 size={13} />
      ) : (
        <Clock3 size={13} />
      )}
      {status}
    </span>
  );
}

function LoadingState({
  label,
}: {
  label: string;
}) {
  return (
    <div className="sa-empty-state">
      <Loader2
        size={27}
        className="sa-spin"
      />
      <strong>{label}</strong>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="sa-empty-state">
      <span>
        <Megaphone size={25} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function DetailCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sa-detail-card">
      <h3>
        {icon}
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function DetailLine({
  icon,
  label,
  value,
  emphasis = false,
  mono = false,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="sa-detail-line">
      <span>
        {icon}
        {label}
      </span>
      <strong
        className={`${emphasis ? "emphasis" : ""} ${mono ? "mono" : ""}`.trim()}
      >
        {value}
      </strong>
    </div>
  );
}
