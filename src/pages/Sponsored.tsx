import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  CSSProperties,
} from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  Filter,
  ImageIcon,
  Mail,
  Megaphone,
  Phone,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

type SponsorshipStatus =
  | "Pending"
  | "Active"
  | "Rejected"
  | "Expired";

type SponsorshipRequest = {
  id: string;
  companyId: string;
  companyName: string;
  representativeName: string;
  email: string;
  phone: string;

  packageName: "Sponsored Listing";
  requestedDurationDays: number;
  packagePrice: number;

  paymentMethod: "GCash";
  paymentReference: string;
  paymentProofName: string;
  paymentVerified: boolean;
  paymentVerifiedAt?: string;

  requestedAt: string;
  status: SponsorshipStatus;

  approvedAt?: string;
  startDate?: string;
  endDate?: string;

  rejectedAt?: string;
  rejectionReason?: string;
};

const COLORS = {
  navy: "#123B5D",
  blue: "#2F6F91",
  lightBlue: "#EAF4F8",
  gold: "#F5B82E",
  background: "#F7F9FB",
  white: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#DCE5EA",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
};

const STORAGE_KEY =
  "cargo-track-admin-sponsored-listings-v1";

const INITIAL_REQUESTS:
  SponsorshipRequest[] = [
    {
      id: "SP-2026-0001",
      companyId: "abc",
      companyName:
        "ABC Cargo Express",
      representativeName:
        "Juan Santos",
      email:
        "abcargo@example.com",
      phone: "09171234567",
      packageName:
        "Sponsored Listing",
      requestedDurationDays: 30,
      packagePrice: 999,
      paymentMethod: "GCash",
      paymentReference:
        "1000123456789",
      paymentProofName:
        "gcash-receipt-abc.jpg",
      paymentVerified: false,
      requestedAt:
        "2026-08-29T08:30:00.000Z",
      status: "Pending",
    },
    {
      id: "SP-2026-0002",
      companyId: "xyz",
      companyName:
        "XYZ Logistics",
      representativeName:
        "Andrea Reyes",
      email:
        "xyzlogistics@example.com",
      phone: "09181234567",
      packageName:
        "Sponsored Listing",
      requestedDurationDays: 30,
      packagePrice: 999,
      paymentMethod: "GCash",
      paymentReference:
        "1000987654321",
      paymentProofName:
        "gcash-receipt-xyz.jpg",
      paymentVerified: true,
      paymentVerifiedAt:
        "2026-08-24T09:10:00.000Z",
      requestedAt:
        "2026-08-24T06:15:00.000Z",
      status: "Active",
      approvedAt:
        "2026-08-24T09:20:00.000Z",
      startDate:
        "2026-08-24T09:20:00.000Z",
      endDate:
        "2026-09-23T09:20:00.000Z",
    },
    {
      id: "SP-2026-0003",
      companyId: "island",
      companyName:
        "Island Cargo Services",
      representativeName:
        "Paolo Mendoza",
      email:
        "islandcargo@example.com",
      phone: "09201234567",
      packageName:
        "Sponsored Listing",
      requestedDurationDays: 15,
      packagePrice: 549,
      paymentMethod: "GCash",
      paymentReference:
        "1000456123789",
      paymentProofName:
        "gcash-receipt-island.jpg",
      paymentVerified: false,
      requestedAt:
        "2026-08-20T02:40:00.000Z",
      status: "Rejected",
      rejectedAt:
        "2026-08-20T04:05:00.000Z",
      rejectionReason:
        "Please confirm the sponsorship request details before activation.",
    },
    {
      id: "SP-2026-0004",
      companyId: "harbor",
      companyName:
        "Harbor Cargo Palawan",
      representativeName:
        "Ana Mendoza",
      email:
        "harborcargo@example.com",
      phone: "09301234567",
      packageName:
        "Sponsored Listing",
      requestedDurationDays: 7,
      packagePrice: 299,
      paymentMethod: "GCash",
      paymentReference:
        "1000765432198",
      paymentProofName:
        "gcash-receipt-harbor.jpg",
      paymentVerified: true,
      paymentVerifiedAt:
        "2026-08-10T05:00:00.000Z",
      requestedAt:
        "2026-08-10T03:00:00.000Z",
      status: "Expired",
      approvedAt:
        "2026-08-10T05:10:00.000Z",
      startDate:
        "2026-08-10T05:10:00.000Z",
      endDate:
        "2026-08-17T05:10:00.000Z",
    },
  ];

function loadRequests() {
  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return INITIAL_REQUESTS;
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return INITIAL_REQUESTS;
    }

    return parsed.map(
      (item) => {
        const request =
          item as Partial<SponsorshipRequest> &
            Pick<
              SponsorshipRequest,
              | "id"
              | "requestedDurationDays"
              | "status"
            >;

        const legacyVerified =
          request.status === "Active" ||
          request.status === "Expired";

        return {
          ...request,
          packagePrice:
            request.packagePrice ??
            getPackagePrice(
              request.requestedDurationDays
            ),
          paymentMethod:
            request.paymentMethod ?? "GCash",
          paymentReference:
            request.paymentReference ??
            `SAMPLE-${request.id}`,
          paymentProofName:
            request.paymentProofName ??
            "sample-gcash-receipt.jpg",
          paymentVerified:
            request.paymentVerified ??
            legacyVerified,
        } as SponsorshipRequest;
      }
    );
  } catch {
    return INITIAL_REQUESTS;
  }
}

function formatDateTime(
  value?: string
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(new Date(value));
}

function formatPeso(
  value: number
) {
  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function getPackagePrice(
  duration: number
) {
  if (duration === 7) {
    return 299;
  }

  if (duration === 15) {
    return 549;
  }

  return 999;
}

function addDays(
  value: Date,
  days: number
) {
  const next =
    new Date(value);

  next.setDate(
    next.getDate() + days
  );

  return next;
}

function normalizeExpired(
  requests:
    SponsorshipRequest[]
) {
  const now =
    Date.now();

  return requests.map(
    (request) => {
      if (
        request.status ===
          "Active" &&
        request.endDate &&
        new Date(
          request.endDate
        ).getTime() < now
      ) {
        return {
          ...request,
          status:
            "Expired" as const,
        };
      }

      return request;
    }
  );
}

function statusConfig(
  status: SponsorshipStatus
) {
  if (status === "Active") {
    return {
      color: COLORS.success,
      background: "#F0FDF4",
      icon: CheckCircle2,
    };
  }

  if (
    status === "Rejected"
  ) {
    return {
      color: COLORS.danger,
      background: "#FFF1F2",
      icon: XCircle,
    };
  }

  if (
    status === "Expired"
  ) {
    return {
      color: COLORS.muted,
      background: "#F1F5F9",
      icon: Clock3,
    };
  }

  return {
    color: COLORS.warning,
    background: "#FFF7ED",
    icon: Clock3,
  };
}

export default function Sponsored() {
  const [
    requests,
    setRequests,
  ] = useState<
    SponsorshipRequest[]
  >(() =>
    normalizeExpired(
      loadRequests()
    )
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<
      "All" |
      SponsorshipStatus
    >("All");

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const [
    rejectVisible,
    setRejectVisible,
  ] = useState(false);

  const [
    proofVisible,
    setProofVisible,
  ] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(requests)
    );
  }, [requests]);

  const selectedRequest =
    useMemo(
      () =>
        requests.find(
          (request) =>
            request.id ===
            selectedId
        ),
      [requests, selectedId]
    );

  const filteredRequests =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return requests.filter(
        (request) => {
          const matchesFilter =
            filter === "All" ||
            request.status ===
              filter;

          const matchesSearch =
            !query ||
            [
              request.id,
              request.companyName,
              request.representativeName,
              request.email,
              request.phone,
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
    }, [
      requests,
      filter,
      search,
    ]);

  const counts =
    useMemo(
      () => ({
        all: requests.length,
        pending:
          requests.filter(
            (request) =>
              request.status ===
              "Pending"
          ).length,
        active:
          requests.filter(
            (request) =>
              request.status ===
              "Active"
          ).length,
        rejected:
          requests.filter(
            (request) =>
              request.status ===
              "Rejected"
          ).length,
        expired:
          requests.filter(
            (request) =>
              request.status ===
              "Expired"
          ).length,
      }),
      [requests]
    );

  const approveSelected =
    () => {
      if (
        !selectedRequest ||
        selectedRequest.status ===
          "Active"
      ) {
        return;
      }

      if (
        !selectedRequest.paymentVerified
      ) {
        window.alert(
          "Verify the submitted payment proof before approving this sponsorship request."
        );
        return;
      }

      const confirmed =
        window.confirm(
          `Approve sponsorship for ${selectedRequest.companyName}?\n\nThe sponsored listing will be activated for ${selectedRequest.requestedDurationDays} day(s).`
        );

      if (!confirmed) {
        return;
      }

      const start =
        new Date();

      const end =
        addDays(
          start,
          selectedRequest
            .requestedDurationDays
        );

      setRequests(
        (current) =>
          current.map(
            (request) =>
              request.id ===
              selectedRequest.id
                ? {
                    ...request,
                    status:
                      "Active",
                    approvedAt:
                      start.toISOString(),
                    startDate:
                      start.toISOString(),
                    endDate:
                      end.toISOString(),
                    rejectedAt:
                      undefined,
                    rejectionReason:
                      undefined,
                  }
                : request
          )
      );
    };

  const verifySelectedPayment =
    () => {
      if (!selectedRequest) {
        return;
      }

      const confirmed =
        window.confirm(
          `Mark the ${formatPeso(
            selectedRequest.packagePrice
          )} ${selectedRequest.paymentMethod} payment from ${selectedRequest.companyName} as verified?`
        );

      if (!confirmed) {
        return;
      }

      const verifiedAt =
        new Date().toISOString();

      setRequests((current) =>
        current.map((request) =>
          request.id === selectedRequest.id
            ? {
                ...request,
                paymentVerified: true,
                paymentVerifiedAt:
                  verifiedAt,
              }
            : request
        )
      );
    };

  const openReject = () => {
    if (!selectedRequest) {
      return;
    }

    setRejectionReason(
      selectedRequest
        .rejectionReason ||
        ""
    );

    setRejectVisible(true);
  };

  const confirmReject =
    () => {
      if (!selectedRequest) {
        return;
      }

      if (
        rejectionReason
          .trim()
          .length < 8
      ) {
        window.alert(
          "Please enter a clear rejection reason."
        );
        return;
      }

      const now =
        new Date()
          .toISOString();

      setRequests(
        (current) =>
          current.map(
            (request) =>
              request.id ===
              selectedRequest.id
                ? {
                    ...request,
                    status:
                      "Rejected",
                    rejectedAt:
                      now,
                    rejectionReason:
                      rejectionReason.trim(),
                    approvedAt:
                      undefined,
                    startDate:
                      undefined,
                    endDate:
                      undefined,
                    paymentVerified: false,
                    paymentVerifiedAt:
                      undefined,
                  }
                : request
          )
      );

      setRejectVisible(
        false
      );
      setRejectionReason(
        ""
      );
    };

  const filters: Array<{
    key:
      | "All"
      | SponsorshipStatus;
    label: string;
    count: number;
  }> = [
    {
      key: "All",
      label: "All",
      count: counts.all,
    },
    {
      key: "Pending",
      label: "Pending",
      count: counts.pending,
    },
    {
      key: "Active",
      label: "Active",
      count: counts.active,
    },
    {
      key: "Rejected",
      label: "Rejected",
      count: counts.rejected,
    },
    {
      key: "Expired",
      label: "Expired",
      count: counts.expired,
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            ADMIN PORTAL
          </div>

          <h1 style={styles.title}>
            Sponsored Listings
          </h1>

          <p
            style={styles.subtitle}
          >
            Review cargo companies
            that availed sponsored
            placement and manage
            activation status.
          </p>
        </div>

        <div
          style={
            styles.headerIcon
          }
        >
          <Megaphone
            size={25}
            color={COLORS.blue}
          />
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard
          icon={Clock3}
          value={counts.pending}
          label="Pending Requests"
          tone="warning"
        />

        <StatCard
          icon={Sparkles}
          value={counts.active}
          label="Active Sponsored"
          tone="success"
        />

        <StatCard
          icon={XCircle}
          value={counts.rejected}
          label="Rejected"
          tone="danger"
        />

        <StatCard
          icon={CalendarDays}
          value={counts.expired}
          label="Expired"
          tone="muted"
        />
      </div>

      <div
        style={
          styles.toolbarCard
        }
      >
        <div
          style={
            styles.searchBox
          }
        >
          <Search
            size={18}
            color={COLORS.muted}
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search company, representative, email or request ID..."
            style={styles.searchInput}
          />
        </div>

        <div
          style={
            styles.filterLabel
          }
        >
          <Filter
            size={17}
            color={COLORS.blue}
          />
          Status
        </div>

        <div
          style={styles.filters}
        >
          {filters.map(
            (item) => {
              const selected =
                filter ===
                item.key;

              return (
                <button
                  key={item.key}
                  style={{
                    ...styles.filterButton,
                    ...(selected
                      ? styles.filterButtonActive
                      : {}),
                  }}
                  onClick={() =>
                    setFilter(
                      item.key
                    )
                  }
                >
                  {item.label}

                  <span
                    style={{
                      ...styles.filterCount,
                      ...(selected
                        ? styles.filterCountActive
                        : {}),
                    }}
                  >
                    {item.count}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      <div
        style={
          styles.tableCard
        }
      >
        <div
          style={
            styles.tableHeader
          }
        >
          <div>
            <div
              style={
                styles.tableTitle
              }
            >
              Sponsorship Requests
            </div>

            <div
              style={
                styles.tableSubtitle
              }
            >
              Companies that
              requested sponsored
              placement
            </div>
          </div>

          <div
            style={
              styles.resultCount
            }
          >
            {
              filteredRequests.length
            }{" "}
            result
            {filteredRequests.length ===
            1
              ? ""
              : "s"}
          </div>
        </div>

        <div
          style={
            styles.tableWrap
          }
        >
          <table
            style={styles.table}
          >
            <thead>
              <tr>
                <th
                  style={
                    styles.th
                  }
                >
                  Company
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Package
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Requested
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Duration
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Price
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Status
                </th>

                <th
                  style={
                    styles.thAction
                  }
                >
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.map(
                (request) => (
                  <SponsoredRow
                    key={
                      request.id
                    }
                    request={
                      request
                    }
                    onView={() =>
                      setSelectedId(
                        request.id
                      )
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredRequests.length ===
          0 && (
          <div
            style={
              styles.emptyState
            }
          >
            <Search
              size={28}
              color={
                COLORS.muted
              }
            />

            <div
              style={
                styles.emptyTitle
              }
            >
              No sponsorship
              requests found
            </div>

            <div
              style={
                styles.emptyText
              }
            >
              Try another search
              or status filter.
            </div>
          </div>
        )}
      </div>

      <div
        style={
          styles.prototypeNotice
        }
      >
        <AlertTriangle
          size={20}
          color={
            COLORS.warning
          }
        />

        <div>
          <div
            style={
              styles.prototypeNoticeTitle
            }
          >
            Prototype behavior
          </div>

          <div
            style={
              styles.prototypeNoticeText
            }
          >
            Sponsorship records and
            Approve / Reject actions
            are stored in this admin
            browser using
            localStorage. The Expo
            business app is not yet
            connected to this page
            until both projects share
            a backend.
          </div>
        </div>
      </div>

      {selectedRequest && (
        <div
          style={
            styles.modalBackdrop
          }
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedId(
                null
              );
            }
          }}
        >
          <div
            style={
              styles.detailsModal
            }
          >
            <div
              style={
                styles.modalHeader
              }
            >
              <div>
                <div
                  style={
                    styles.modalEyebrow
                  }
                >
                  {
                    selectedRequest.id
                  }
                </div>

                <div
                  style={
                    styles.modalTitle
                  }
                >
                  {
                    selectedRequest.companyName
                  }
                </div>
              </div>

              <button
                style={
                  styles.iconButton
                }
                onClick={() =>
                  setSelectedId(
                    null
                  )
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={
                styles.modalBody
              }
            >
              <StatusHero
                request={
                  selectedRequest
                }
              />

              <SectionTitle
                title="Company Information"
                subtitle="Cargo business that requested sponsored placement"
              />

              <div
                style={
                  styles.infoGrid
                }
              >
                <InfoCard
                  icon={
                    Building2
                  }
                  label="Company"
                  value={
                    selectedRequest.companyName
                  }
                />

                <InfoCard
                  icon={
                    UserRound
                  }
                  label="Representative"
                  value={
                    selectedRequest.representativeName
                  }
                />

                <InfoCard
                  icon={Mail}
                  label="Email"
                  value={
                    selectedRequest.email
                  }
                />

                <InfoCard
                  icon={Phone}
                  label="Contact"
                  value={
                    selectedRequest.phone
                  }
                />
              </div>

              <SectionTitle
                title="Sponsorship Details"
                subtitle="Requested package and campaign period"
              />

              <div
                style={
                  styles.detailCard
                }
              >
                <DetailRow
                  label="Package"
                  value={
                    selectedRequest.packageName
                  }
                />

                <DetailRow
                  label="Requested Duration"
                  value={`${selectedRequest.requestedDurationDays} day(s)`}
                />

                <DetailRow
                  label="Package Price"
                  value={formatPeso(
                    selectedRequest.packagePrice
                  )}
                />

                <DetailRow
                  label="Requested At"
                  value={formatDateTime(
                    selectedRequest.requestedAt
                  )}
                />

                <DetailRow
                  label="Start Date"
                  value={formatDate(
                    selectedRequest.startDate
                  )}
                />

                <DetailRow
                  label="End Date"
                  value={formatDate(
                    selectedRequest.endDate
                  )}
                />
              </div>

              <SectionTitle
                title="Payment Verification"
                subtitle="Review the submitted GCash reference and sample payment proof"
              />

              <div
                style={
                  styles.paymentPanel
                }
              >
                <div
                  style={
                    styles.paymentPanelHeader
                  }
                >
                  <div
                    style={
                      styles.paymentIcon
                    }
                  >
                    <CreditCard
                      size={21}
                      color={COLORS.blue}
                    />
                  </div>

                  <div
                    style={{ flex: 1 }}
                  >
                    <div
                      style={
                        styles.paymentTitle
                      }
                    >
                      {
                        selectedRequest.paymentMethod
                      } Payment
                    </div>

                    <div
                      style={
                        styles.paymentSubtitle
                      }
                    >
                      Manually verify before activating
                      the sponsored listing.
                    </div>
                  </div>

                  <div
                    style={{
                      ...styles.verificationBadge,
                      ...(selectedRequest.paymentVerified
                        ? styles.verificationBadgeSuccess
                        : styles.verificationBadgePending),
                    }}
                  >
                    {selectedRequest.paymentVerified
                      ? "VERIFIED"
                      : "FOR VERIFICATION"}
                  </div>
                </div>

                <div
                  style={
                    styles.paymentDetailsGrid
                  }
                >
                  <PaymentInfo
                    label="Amount Paid"
                    value={formatPeso(
                      selectedRequest.packagePrice
                    )}
                  />

                  <PaymentInfo
                    label="Payment Method"
                    value={
                      selectedRequest.paymentMethod
                    }
                  />

                  <PaymentInfo
                    label="GCash Reference"
                    value={
                      selectedRequest.paymentReference
                    }
                  />

                  <PaymentInfo
                    label="Verification Date"
                    value={formatDateTime(
                      selectedRequest.paymentVerifiedAt
                    )}
                  />
                </div>

                <div
                  style={
                    styles.proofCard
                  }
                >
                  <div
                    style={
                      styles.proofFileIcon
                    }
                  >
                    <ImageIcon
                      size={22}
                      color={COLORS.blue}
                    />
                  </div>

                  <div
                    style={{ flex: 1 }}
                  >
                    <div
                      style={
                        styles.proofFileName
                      }
                    >
                      {
                        selectedRequest.paymentProofName
                      }
                    </div>

                    <div
                      style={
                        styles.proofFileText
                      }
                    >
                      Submitted payment proof
                    </div>
                  </div>

                  <button
                    style={
                      styles.viewProofButton
                    }
                    onClick={() =>
                      setProofVisible(true)
                    }
                  >
                    <Eye size={16} />
                    View Proof
                  </button>
                </div>

                {selectedRequest.paymentVerified ? (
                  <div
                    style={
                      styles.verifiedNotice
                    }
                  >
                    <ShieldCheck
                      size={19}
                      color={COLORS.success}
                    />

                    <div>
                      <div
                        style={
                          styles.verifiedNoticeTitle
                        }
                      >
                        Payment verified
                      </div>

                      <div
                        style={
                          styles.verifiedNoticeText
                        }
                      >
                        This request can now be
                        approved and activated.
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    style={
                      styles.verifyPaymentButton
                    }
                    onClick={
                      verifySelectedPayment
                    }
                  >
                    <ShieldCheck size={18} />
                    Mark Payment as Verified
                  </button>
                )}
              </div>

              {selectedRequest.status ===
                "Rejected" &&
                selectedRequest.rejectionReason && (
                  <div
                    style={
                      styles.rejectionCard
                    }
                  >
                    <XCircle
                      size={20}
                      color={
                        COLORS.danger
                      }
                    />

                    <div>
                      <div
                        style={
                          styles.rejectionTitle
                        }
                      >
                        Rejection Reason
                      </div>

                      <div
                        style={
                          styles.rejectionText
                        }
                      >
                        {
                          selectedRequest.rejectionReason
                        }
                      </div>
                    </div>
                  </div>
                )}

              {selectedRequest.status ===
                "Active" && (
                <div
                  style={
                    styles.activeNotice
                  }
                >
                  <ShieldCheck
                    size={21}
                    color={
                      COLORS.success
                    }
                  />

                  <div>
                    <div
                      style={
                        styles.activeNoticeTitle
                      }
                    >
                      Sponsored placement
                      active
                    </div>

                    <div
                      style={
                        styles.activeNoticeText
                      }
                    >
                      This company is
                      approved for
                      sponsored placement
                      until{" "}
                      {formatDate(
                        selectedRequest.endDate
                      )}
                      .
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={
                styles.modalFooter
              }
            >
              {selectedRequest.status !==
                "Active" && (
                <button
                  style={
                    styles.rejectButton
                  }
                  onClick={
                    openReject
                  }
                >
                  <XCircle
                    size={18}
                  />
                  Reject
                </button>
              )}

              {selectedRequest.status !==
                "Active" && (
                <button
                  style={{
                    ...styles.approveButton,
                    ...(!selectedRequest.paymentVerified
                      ? styles.disabledButton
                      : {}),
                  }}
                  disabled={
                    !selectedRequest.paymentVerified
                  }
                  onClick={
                    approveSelected
                  }
                >
                  <Sparkles
                    size={18}
                  />
                  Approve & Activate
                </button>
              )}

              {selectedRequest.status ===
                "Active" && (
                <div
                  style={
                    styles.activeFooterText
                  }
                >
                  <CheckCircle2
                    size={18}
                    color={
                      COLORS.success
                    }
                  />
                  Sponsored listing is
                  currently active.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectVisible &&
        selectedRequest && (
          <div
            style={
              styles.modalBackdrop
            }
          >
            <div
              style={
                styles.rejectModal
              }
            >
              <div
                style={
                  styles.modalHeader
                }
              >
                <div>
                  <div
                    style={
                      styles.modalEyebrow
                    }
                  >
                    REJECT SPONSORSHIP
                  </div>

                  <div
                    style={
                      styles.rejectModalTitle
                    }
                  >
                    {
                      selectedRequest.companyName
                    }
                  </div>
                </div>

                <button
                  style={
                    styles.iconButton
                  }
                  onClick={() =>
                    setRejectVisible(
                      false
                    )
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <div
                style={
                  styles.rejectBody
                }
              >
                <label
                  style={
                    styles.textareaLabel
                  }
                >
                  Rejection reason
                </label>

                <textarea
                  value={
                    rejectionReason
                  }
                  onChange={(
                    event
                  ) =>
                    setRejectionReason(
                      event.target.value
                    )
                  }
                  placeholder="Explain why this sponsorship request cannot be activated yet..."
                  style={
                    styles.textarea
                  }
                />

                <div
                  style={
                    styles.rejectHint
                  }
                >
                  Enter a clear reason
                  that the cargo
                  business can
                  understand.
                </div>
              </div>

              <div
                style={
                  styles.rejectFooter
                }
              >
                <button
                  style={
                    styles.cancelButton
                  }
                  onClick={() =>
                    setRejectVisible(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  style={
                    styles.confirmRejectButton
                  }
                  onClick={
                    confirmReject
                  }
                >
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        )}

      {proofVisible &&
        selectedRequest && (
          <div
            style={{
              ...styles.modalBackdrop,
              zIndex: 1100,
            }}
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setProofVisible(false);
              }
            }}
          >
            <div
              style={
                styles.proofModal
              }
            >
              <div
                style={
                  styles.modalHeader
                }
              >
                <div>
                  <div
                    style={
                      styles.modalEyebrow
                    }
                  >
                    PAYMENT PROOF
                  </div>

                  <div
                    style={
                      styles.rejectModalTitle
                    }
                  >
                    {
                      selectedRequest.paymentProofName
                    }
                  </div>
                </div>

                <button
                  style={
                    styles.iconButton
                  }
                  onClick={() =>
                    setProofVisible(false)
                  }
                  aria-label="Close payment proof"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                style={
                  styles.proofModalBody
                }
              >
                <div
                  style={
                    styles.sampleReceipt
                  }
                >
                  <div
                    style={
                      styles.receiptBrand
                    }
                  >
                    <div
                      style={
                        styles.receiptBrandIcon
                      }
                    >
                      <Receipt size={24} />
                    </div>

                    <div>
                      <div
                        style={
                          styles.receiptBrandName
                        }
                      >
                        GCash
                      </div>

                      <div
                        style={
                          styles.receiptBrandSubtext
                        }
                      >
                        Sample transaction receipt
                      </div>
                    </div>
                  </div>

                  <CheckCircle2
                    size={44}
                    color={COLORS.success}
                  />

                  <div
                    style={
                      styles.receiptSuccess
                    }
                  >
                    Payment Successful
                  </div>

                  <div
                    style={
                      styles.receiptAmount
                    }
                  >
                    {formatPeso(
                      selectedRequest.packagePrice
                    )}
                  </div>

                  <div
                    style={
                      styles.receiptDetails
                    }
                  >
                    <DetailRow
                      label="Paid By"
                      value={
                        selectedRequest.companyName
                      }
                    />

                    <DetailRow
                      label="Sent To"
                      value="Cargo Track PH Admin"
                    />

                    <DetailRow
                      label="Reference No."
                      value={
                        selectedRequest.paymentReference
                      }
                    />

                    <DetailRow
                      label="Submitted"
                      value={formatDateTime(
                        selectedRequest.requestedAt
                      )}
                    />
                  </div>

                  <div
                    style={
                      styles.receiptPrototypeNote
                    }
                  >
                    Prototype preview only — no real
                    transaction was processed.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function SponsoredRow({
  request,
  onView,
}: {
  request: SponsorshipRequest;
  onView: () => void;
}) {
  const config =
    statusConfig(
      request.status
    );

  const Icon =
    config.icon;

  return (
    <tr>
      <td style={styles.td}>
        <div
          style={
            styles.companyCell
          }
        >
          <div
            style={
              styles.companyAvatar
            }
          >
            <Building2
              size={18}
              color={COLORS.blue}
            />
          </div>

          <div>
            <div
              style={
                styles.companyName
              }
            >
              {
                request.companyName
              }
            </div>

            <div
              style={
                styles.companyMeta
              }
            >
              {request.id}
            </div>
          </div>
        </div>
      </td>

      <td style={styles.td}>
        <div
          style={
            styles.packageBadge
          }
        >
          <Sparkles
            size={14}
          />
          {
            request.packageName
          }
        </div>
      </td>

      <td style={styles.td}>
        <div
          style={styles.dateText}
        >
          {formatDateTime(
            request.requestedAt
          )}
        </div>
      </td>

      <td style={styles.td}>
        <div
          style={
            styles.durationText
          }
        >
          {
            request.requestedDurationDays
          }{" "}
          days
        </div>
      </td>

      <td style={styles.td}>
        <div
          style={
            styles.priceText
          }
        >
          {formatPeso(
            request.packagePrice
          )}
        </div>
      </td>

      <td style={styles.td}>
        <div
          style={{
            ...styles.statusBadge,
            background:
              config.background,
            color:
              config.color,
          }}
        >
          <Icon size={14} />
          {request.status}
        </div>
      </td>

      <td
        style={
          styles.tdAction
        }
      >
        <button
          style={
            styles.viewButton
          }
          onClick={onView}
        >
          <Eye size={16} />
          View
        </button>
      </td>
    </tr>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Clock3;
  value: number;
  label: string;
  tone:
    | "warning"
    | "success"
    | "danger"
    | "muted";
}) {
  const toneMap = {
    warning: {
      background:
        "#FFF7ED",
      color:
        COLORS.warning,
    },
    success: {
      background:
        "#F0FDF4",
      color:
        COLORS.success,
    },
    danger: {
      background:
        "#FFF1F2",
      color:
        COLORS.danger,
    },
    muted: {
      background:
        "#F1F5F9",
      color:
        COLORS.muted,
    },
  };

  const selected =
    toneMap[tone];

  return (
    <div
      style={
        styles.statCard
      }
    >
      <div
        style={{
          ...styles.statIcon,
          background:
            selected.background,
        }}
      >
        <Icon
          size={21}
          color={
            selected.color
          }
        />
      </div>

      <div>
        <div
          style={
            styles.statValue
          }
        >
          {value}
        </div>

        <div
          style={
            styles.statLabel
          }
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function StatusHero({
  request,
}: {
  request: SponsorshipRequest;
}) {
  const config =
    statusConfig(
      request.status
    );

  const Icon =
    config.icon;

  const message =
    request.status ===
    "Pending"
      ? "Waiting for admin review before sponsored placement becomes active."
      : request.status ===
        "Active"
      ? `Sponsored placement is active until ${formatDate(
          request.endDate
        )}.`
      : request.status ===
        "Rejected"
      ? "This sponsorship request was rejected and is not active."
      : "The sponsored placement period has ended.";

  return (
    <div
      style={{
        ...styles.statusHero,
        background:
          config.background,
      }}
    >
      <div
        style={{
          ...styles.statusHeroIcon,
          color:
            config.color,
        }}
      >
        <Icon size={25} />
      </div>

      <div>
        <div
          style={{
            ...styles.statusHeroTitle,
            color:
              config.color,
          }}
        >
          {request.status}
        </div>

        <div
          style={
            styles.statusHeroText
          }
        >
          {message}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={
        styles.sectionTitleWrap
      }
    >
      <div
        style={
          styles.sectionTitle
        }
      >
        {title}
      </div>

      <div
        style={
          styles.sectionSubtitle
        }
      >
        {subtitle}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div
      style={
        styles.infoCard
      }
    >
      <div
        style={
          styles.infoIcon
        }
      >
        <Icon
          size={18}
          color={COLORS.blue}
        />
      </div>

      <div>
        <div
          style={
            styles.infoLabel
          }
        >
          {label}
        </div>

        <div
          style={
            styles.infoValue
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={
        styles.detailRow
      }
    >
      <div
        style={
          styles.detailLabel
        }
      >
        {label}
      </div>

      <div
        style={
          styles.detailValue
        }
      >
        {value}
      </div>
    </div>
  );
}

function PaymentInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={
        styles.paymentInfo
      }
    >
      <div
        style={
          styles.paymentInfoLabel
        }
      >
        {label}
      </div>

      <div
        style={
          styles.paymentInfoValue
        }
      >
        {value}
      </div>
    </div>
  );
}

const styles:
  Record<
    string,
    CSSProperties
  > = {
  page: {
    minHeight: "100vh",
    background:
      COLORS.background,
    padding: "30px",
    color: COLORS.text,
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: "20px",
    marginBottom: "24px",
  },

  eyebrow: {
    color: COLORS.blue,
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "1.2px",
  },

  title: {
    margin: "6px 0 0",
    color: COLORS.navy,
    fontSize: "30px",
    lineHeight: 1.15,
  },

  subtitle: {
    margin: "8px 0 0",
    maxWidth: "650px",
    color: COLORS.muted,
    fontSize: "14px",
    lineHeight: 1.6,
  },

  headerIcon: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    background:
      COLORS.lightBlue,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    flexShrink: 0,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "18px",
  },

  statCard: {
    background:
      COLORS.white,
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "18px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxShadow:
      "0 8px 24px rgba(15, 23, 42, 0.04)",
  },

  statIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    flexShrink: 0,
  },

  statValue: {
    color: COLORS.navy,
    fontSize: "22px",
    fontWeight: 900,
  },

  statLabel: {
    color: COLORS.muted,
    fontSize: "12px",
    marginTop: "2px",
  },

  toolbarCard: {
    background:
      COLORS.white,
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "18px",
    padding: "14px",
    marginBottom: "18px",
  },

  searchBox: {
    minHeight: "48px",
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "13px",
    background: "#FBFCFD",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "0 13px",
  },

  searchInput: {
    flex: 1,
    width: "100%",
    border: "none",
    outline: "none",
    background:
      "transparent",
    color: COLORS.text,
    fontSize: "13px",
  },

  filterLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: COLORS.navy,
    fontSize: "12px",
    fontWeight: 800,
    marginTop: "13px",
    marginBottom: "8px",
  },

  filters: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  filterButton: {
    minHeight: "38px",
    borderRadius: "11px",
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    color: COLORS.navy,
    padding: "0 11px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "12px",
  },

  filterButtonActive: {
    background: COLORS.blue,
    borderColor: COLORS.blue,
    color: COLORS.white,
  },

  filterCount: {
    minWidth: "22px",
    height: "22px",
    padding: "0 6px",
    borderRadius: "999px",
    background:
      COLORS.lightBlue,
    color: COLORS.blue,
    display: "inline-flex",
    alignItems: "center",
    justifyContent:
      "center",
    fontSize: "10px",
    fontWeight: 900,
  },

  filterCountActive: {
    background:
      "rgba(255,255,255,0.18)",
    color: COLORS.white,
  },

  tableCard: {
    background:
      COLORS.white,
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow:
      "0 10px 30px rgba(15, 23, 42, 0.04)",
  },

  tableHeader: {
    padding: "18px 20px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    borderBottom:
      `1px solid ${COLORS.border}`,
  },

  tableTitle: {
    color: COLORS.navy,
    fontSize: "16px",
    fontWeight: 900,
  },

  tableSubtitle: {
    color: COLORS.muted,
    fontSize: "12px",
    marginTop: "3px",
  },

  resultCount: {
    background:
      COLORS.lightBlue,
    color: COLORS.blue,
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "11px",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  tableWrap: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse:
      "collapse",
    minWidth: "860px",
  },

  th: {
    textAlign: "left",
    padding: "12px 18px",
    background: "#F8FAFC",
    color: COLORS.muted,
    fontSize: "10px",
    letterSpacing: "0.5px",
    fontWeight: 900,
    borderBottom:
      `1px solid ${COLORS.border}`,
  },

  thAction: {
    textAlign: "right",
    padding: "12px 18px",
    background: "#F8FAFC",
    color: COLORS.muted,
    fontSize: "10px",
    letterSpacing: "0.5px",
    fontWeight: 900,
    borderBottom:
      `1px solid ${COLORS.border}`,
  },

  td: {
    padding: "14px 18px",
    borderBottom:
      `1px solid ${COLORS.border}`,
    verticalAlign: "middle",
  },

  tdAction: {
    padding: "14px 18px",
    borderBottom:
      `1px solid ${COLORS.border}`,
    textAlign: "right",
    verticalAlign: "middle",
  },

  companyCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  companyAvatar: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    background:
      COLORS.lightBlue,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    flexShrink: 0,
  },

  companyName: {
    color: COLORS.navy,
    fontSize: "12px",
    fontWeight: 900,
  },

  companyMeta: {
    color: COLORS.muted,
    fontSize: "10px",
    marginTop: "2px",
  },

  packageBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "#FFF7D6",
    color: "#8A6300",
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "10px",
    fontWeight: 900,
  },

  dateText: {
    color: COLORS.text,
    fontSize: "11px",
  },

  durationText: {
    color: COLORS.navy,
    fontSize: "11px",
    fontWeight: 800,
  },

  priceText: {
    color: COLORS.blue,
    fontSize: "11px",
    fontWeight: 900,
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "10px",
    fontWeight: 900,
  },

  viewButton: {
    minHeight: "34px",
    borderRadius: "10px",
    border: "none",
    background:
      COLORS.lightBlue,
    color: COLORS.blue,
    padding: "0 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "11px",
  },

  emptyState: {
    padding: "42px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },

  emptyTitle: {
    marginTop: "10px",
    color: COLORS.navy,
    fontSize: "14px",
    fontWeight: 900,
  },

  emptyText: {
    marginTop: "4px",
    color: COLORS.muted,
    fontSize: "12px",
  },

  prototypeNotice: {
    marginTop: "18px",
    border:
      "1px solid #F2D2A4",
    background: "#FFF7ED",
    borderRadius: "16px",
    padding: "13px",
    display: "flex",
    gap: "9px",
    alignItems: "flex-start",
  },

  prototypeNoticeTitle: {
    color: COLORS.warning,
    fontSize: "11px",
    fontWeight: 900,
  },

  prototypeNoticeText: {
    color: COLORS.muted,
    fontSize: "11px",
    lineHeight: 1.5,
    marginTop: "2px",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    padding: "24px",
    zIndex: 1000,
  },

  detailsModal: {
    width: "min(760px, 100%)",
    maxHeight: "90vh",
    background:
      COLORS.white,
    borderRadius: "22px",
    overflow: "hidden",
    boxShadow:
      "0 24px 70px rgba(15, 23, 42, 0.24)",
    display: "flex",
    flexDirection: "column",
  },

  modalHeader: {
    padding: "17px 19px",
    borderBottom:
      `1px solid ${COLORS.border}`,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "14px",
  },

  modalEyebrow: {
    color: COLORS.blue,
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.8px",
  },

  modalTitle: {
    color: COLORS.navy,
    fontSize: "20px",
    fontWeight: 900,
    marginTop: "3px",
  },

  iconButton: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    color: COLORS.navy,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    cursor: "pointer",
  },

  modalBody: {
    padding: "18px 19px",
    overflowY: "auto",
  },

  statusHero: {
    borderRadius: "16px",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  statusHeroIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background:
      COLORS.white,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    flexShrink: 0,
  },

  statusHeroTitle: {
    fontSize: "13px",
    fontWeight: 900,
  },

  statusHeroText: {
    color: COLORS.muted,
    fontSize: "11px",
    lineHeight: 1.5,
    marginTop: "2px",
  },

  sectionTitleWrap: {
    marginTop: "20px",
    marginBottom: "9px",
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: "13px",
    fontWeight: 900,
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: "10px",
    marginTop: "2px",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },

  infoCard: {
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    background: "#FBFCFD",
  },

  infoIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    background:
      COLORS.lightBlue,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    flexShrink: 0,
  },

  infoLabel: {
    color: COLORS.muted,
    fontSize: "9px",
    fontWeight: 800,
  },

  infoValue: {
    color: COLORS.navy,
    fontSize: "11px",
    fontWeight: 900,
    marginTop: "2px",
    wordBreak: "break-word",
  },

  detailCard: {
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "15px",
    overflow: "hidden",
  },

  detailRow: {
    minHeight: "45px",
    padding: "10px 13px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    borderBottom:
      `1px solid ${COLORS.border}`,
  },

  detailLabel: {
    color: COLORS.muted,
    fontSize: "10px",
    fontWeight: 800,
  },

  detailValue: {
    color: COLORS.navy,
    fontSize: "11px",
    fontWeight: 900,
    textAlign: "right",
  },

  paymentPanel: {
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "16px",
    padding: "14px",
    background: "#FBFCFD",
  },

  paymentPanelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  paymentIcon: {
    width: "43px",
    height: "43px",
    borderRadius: "13px",
    background: COLORS.lightBlue,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  paymentTitle: {
    color: COLORS.navy,
    fontSize: "13px",
    fontWeight: 900,
  },

  paymentSubtitle: {
    color: COLORS.muted,
    fontSize: "10px",
    marginTop: "2px",
  },

  verificationBadge: {
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "9px",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  verificationBadgeSuccess: {
    color: COLORS.success,
    background: "#DCFCE7",
  },

  verificationBadgePending: {
    color: COLORS.warning,
    background: "#FFEDD5",
  },

  paymentDetailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "9px",
    marginTop: "13px",
  },

  paymentInfo: {
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "12px",
    background: COLORS.white,
    padding: "10px",
  },

  paymentInfoLabel: {
    color: COLORS.muted,
    fontSize: "9px",
    fontWeight: 800,
  },

  paymentInfoValue: {
    color: COLORS.navy,
    fontSize: "11px",
    fontWeight: 900,
    marginTop: "3px",
    wordBreak: "break-word",
  },

  proofCard: {
    marginTop: "10px",
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "13px",
    background: COLORS.white,
    padding: "10px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  proofFileIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: COLORS.lightBlue,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  proofFileName: {
    color: COLORS.navy,
    fontSize: "11px",
    fontWeight: 900,
  },

  proofFileText: {
    color: COLORS.muted,
    fontSize: "9px",
    marginTop: "2px",
  },

  viewProofButton: {
    minHeight: "34px",
    borderRadius: "10px",
    border:
      `1px solid ${COLORS.blue}`,
    background: COLORS.white,
    color: COLORS.blue,
    padding: "0 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 900,
  },

  verifyPaymentButton: {
    width: "100%",
    minHeight: "42px",
    marginTop: "11px",
    borderRadius: "12px",
    border: "none",
    background: COLORS.blue,
    color: COLORS.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 900,
  },

  verifiedNotice: {
    marginTop: "11px",
    border: "1px solid #BBF7D0",
    borderRadius: "12px",
    background: "#F0FDF4",
    padding: "10px",
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  },

  verifiedNoticeTitle: {
    color: COLORS.success,
    fontSize: "10px",
    fontWeight: 900,
  },

  verifiedNoticeText: {
    color: COLORS.muted,
    fontSize: "9px",
    marginTop: "2px",
  },

  rejectionCard: {
    marginTop: "14px",
    border:
      "1px solid #F2C7CD",
    background: "#FFF1F2",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    gap: "9px",
    alignItems: "flex-start",
  },

  rejectionTitle: {
    color: COLORS.danger,
    fontSize: "10px",
    fontWeight: 900,
  },

  rejectionText: {
    color: COLORS.muted,
    fontSize: "10px",
    lineHeight: 1.5,
    marginTop: "2px",
  },

  activeNotice: {
    marginTop: "14px",
    border:
      "1px solid #C8E8D0",
    background: "#F0FDF4",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    gap: "9px",
    alignItems: "flex-start",
  },

  activeNoticeTitle: {
    color: COLORS.success,
    fontSize: "10px",
    fontWeight: 900,
  },

  activeNoticeText: {
    color: COLORS.muted,
    fontSize: "10px",
    lineHeight: 1.5,
    marginTop: "2px",
  },

  modalFooter: {
    padding: "14px 19px",
    borderTop:
      `1px solid ${COLORS.border}`,
    display: "flex",
    justifyContent:
      "flex-end",
    gap: "9px",
    alignItems: "center",
  },

  rejectButton: {
    minHeight: "42px",
    borderRadius: "12px",
    border:
      "1px solid #F2C7CD",
    background: "#FFF1F2",
    color: COLORS.danger,
    padding: "0 14px",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 900,
  },

  approveButton: {
    minHeight: "42px",
    borderRadius: "12px",
    border: "none",
    background: COLORS.gold,
    color: COLORS.navy,
    padding: "0 15px",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 900,
  },

  disabledButton: {
    opacity: 0.45,
    cursor: "not-allowed",
  },

  activeFooterText: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: COLORS.success,
    fontSize: "11px",
    fontWeight: 900,
  },

  rejectModal: {
    width: "min(520px, 100%)",
    background:
      COLORS.white,
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow:
      "0 24px 70px rgba(15, 23, 42, 0.24)",
  },

  rejectModalTitle: {
    color: COLORS.navy,
    fontSize: "17px",
    fontWeight: 900,
    marginTop: "3px",
  },

  rejectBody: {
    padding: "17px 19px",
  },

  textareaLabel: {
    display: "block",
    color: COLORS.navy,
    fontSize: "11px",
    fontWeight: 900,
    marginBottom: "7px",
  },

  textarea: {
    width: "100%",
    minHeight: "120px",
    resize: "vertical",
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "13px",
    background: "#FBFCFD",
    color: COLORS.text,
    padding: "11px",
    font: "inherit",
    boxSizing: "border-box",
    outline: "none",
  },

  rejectHint: {
    color: COLORS.muted,
    fontSize: "10px",
    marginTop: "6px",
  },

  rejectFooter: {
    padding: "13px 19px",
    borderTop:
      `1px solid ${COLORS.border}`,
    display: "flex",
    justifyContent:
      "flex-end",
    gap: "8px",
  },

  cancelButton: {
    minHeight: "40px",
    borderRadius: "11px",
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    color: COLORS.navy,
    padding: "0 13px",
    cursor: "pointer",
    fontWeight: 900,
  },

  confirmRejectButton: {
    minHeight: "40px",
    borderRadius: "11px",
    border: "none",
    background:
      COLORS.danger,
    color: COLORS.white,
    padding: "0 13px",
    cursor: "pointer",
    fontWeight: 900,
  },

  proofModal: {
    width: "min(500px, 100%)",
    maxHeight: "92vh",
    background: COLORS.white,
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow:
      "0 24px 70px rgba(15, 23, 42, 0.24)",
    display: "flex",
    flexDirection: "column",
  },

  proofModalBody: {
    padding: "18px",
    overflowY: "auto",
    background: "#EEF3F6",
  },

  sampleReceipt: {
    borderRadius: "18px",
    background: COLORS.white,
    padding: "19px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow:
      "0 10px 30px rgba(15, 23, 42, 0.10)",
  },

  receiptBrand: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "20px",
  },

  receiptBrandIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    background: "#E7F3FF",
    color: "#1677D2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  receiptBrandName: {
    color: "#1677D2",
    fontSize: "17px",
    fontWeight: 900,
  },

  receiptBrandSubtext: {
    color: COLORS.muted,
    fontSize: "9px",
    marginTop: "1px",
  },

  receiptSuccess: {
    color: COLORS.success,
    fontSize: "13px",
    fontWeight: 900,
    marginTop: "8px",
  },

  receiptAmount: {
    color: COLORS.navy,
    fontSize: "30px",
    fontWeight: 900,
    marginTop: "5px",
  },

  receiptDetails: {
    width: "100%",
    marginTop: "18px",
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: "14px",
    overflow: "hidden",
  },

  receiptPrototypeNote: {
    width: "100%",
    marginTop: "13px",
    borderRadius: "11px",
    background: "#FFF7ED",
    color: COLORS.warning,
    padding: "9px",
    textAlign: "center",
    fontSize: "9px",
    fontWeight: 800,
  },
};
