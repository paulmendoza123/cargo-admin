import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  CSSProperties,
} from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";

type ApplicationStatus =
  | "Pending"
  | "Approved"
  | "Rejected";

type BusinessDocument = {
  id: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  filePath: string;
  originalName: string;
};

type BusinessApplication = {
  id: string;
  applicationCode: string;
  businessName: string;
  representativeName: string;
  email: string;
  phone: string;
  description: string;

  branchAddress: string;
  branchLatitude: number;
  branchLongitude: number;

  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;

  documents: BusinessDocument[];

  logoUrl: string;
  coverUrl: string;
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

type BusinessApplicationRow = {
  id: string;
  application_code: string;
  business_name: string;
  representative_name: string;
  email: string;
  phone: string;
  description: string;
  branch_address: string;
  branch_latitude: number | null;
  branch_longitude: number | null;
  logo_path: string | null;
  cover_path: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

type BusinessDocumentRow = {
  application_id: string;
  document_type: string;
  file_path: string;
  is_required: boolean | null;
  original_name: string;
};

const DOCUMENT_LABELS:
  Record<string, string> = {
    business_permit:
      "Business Registration / Permit",
    representative_id:
      "Representative Valid ID",
    supporting_document:
      "Additional Supporting Document",
  };

function normalizeStatus(
  value: string
): ApplicationStatus {
  if (value === "approved") {
    return "Approved";
  }

  if (value === "rejected") {
    return "Rejected";
  }

  return "Pending";
}

function getPublicAssetUrl(
  storagePath: string | null
) {
  if (!storagePath) {
    return "";
  }

  return supabase.storage
    .from("business-assets")
    .getPublicUrl(storagePath)
    .data.publicUrl;
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

function statusConfig(
  status: ApplicationStatus
) {
  if (status === "Approved") {
    return {
      color: COLORS.success,
      background: "#F0FDF4",
      icon: CheckCircle2,
    };
  }

  if (status === "Rejected") {
    return {
      color: COLORS.danger,
      background: "#FFF1F2",
      icon: XCircle,
    };
  }

  return {
    color: COLORS.warning,
    background: "#FFF7ED",
    icon: Clock3,
  };
}

export default function Applications() {
  const [
    applications,
    setApplications,
  ] = useState<
    BusinessApplication[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState("");

  const [
    reviewing,
    setReviewing,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<
      "All" | ApplicationStatus
    >("All");

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  const [
    rejectVisible,
    setRejectVisible,
  ] = useState(false);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const loadApplications =
    useCallback(async () => {
      setLoading(true);
      setPageError("");

      try {
        const {
          data: applicationRows,
          error: applicationError,
        } = await supabase
          .from(
            "business_applications"
          )
          .select(`
            id,
            application_code,
            business_name,
            representative_name,
            email,
            phone,
            description,
            branch_address,
            branch_latitude,
            branch_longitude,
            logo_path,
            cover_path,
            status,
            submitted_at,
            reviewed_at,
            rejection_reason
          `)
          .order("submitted_at", {
            ascending: false,
          });

        if (applicationError) {
          throw applicationError;
        }

        const typedApplications =
          (applicationRows || []) as
            BusinessApplicationRow[];

        let documentRows:
          BusinessDocumentRow[] = [];

        const applicationIds =
          typedApplications.map(
            (application) =>
              application.id
          );

        if (
          applicationIds.length > 0
        ) {
          const {
            data: loadedDocuments,
            error: documentError,
          } = await supabase
            .from(
              "business_application_documents"
            )
            .select(`
              application_id,
              document_type,
              file_path,
              is_required,
              original_name
            `)
            .in(
              "application_id",
              applicationIds
            );

          if (documentError) {
            throw documentError;
          }

          documentRows =
            (loadedDocuments || []) as
              BusinessDocumentRow[];
        }

        const mappedApplications =
          typedApplications.map(
            (application) => ({
              id: application.id,
              applicationCode:
                application.application_code,
              businessName:
                application.business_name,
              representativeName:
                application.representative_name,
              email:
                application.email,
              phone:
                application.phone,
              description:
                application.description,
              branchAddress:
                application.branch_address,
              branchLatitude:
                Number(
                  application.branch_latitude ||
                    0
                ),
              branchLongitude:
                Number(
                  application.branch_longitude ||
                    0
                ),
              status:
                normalizeStatus(
                  application.status
                ),
              submittedAt:
                application.submitted_at,
              reviewedAt:
                application.reviewed_at ||
                undefined,
              rejectionReason:
                application.rejection_reason ||
                undefined,
              documents:
                documentRows
                  .filter(
                    (document) =>
                      document.application_id ===
                      application.id
                  )
                  .map(
                    (document) => ({
                      id:
                        document.document_type,
                      label:
                        DOCUMENT_LABELS[
                          document
                            .document_type
                        ] ||
                        document.original_name,
                      required:
                        document.is_required ??
                        document.document_type !==
                          "supporting_document",
                      uploaded: true,
                      filePath:
                        document.file_path,
                      originalName:
                        document.original_name,
                    })
                  ),
              logoUrl:
                getPublicAssetUrl(
                  application.logo_path
                ),
              coverUrl:
                getPublicAssetUrl(
                  application.cover_path
                ),
            })
          );

        setApplications(
          mappedApplications
        );
      } catch (error) {
        console.error(
          "Unable to load business applications:",
          error
        );

        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to load business applications."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    const initialLoad =
      window.setTimeout(
        () => {
          void loadApplications();
        },
        0
      );

    return () => {
      window.clearTimeout(
        initialLoad
      );
    };
  }, [loadApplications]);

  const selectedApplication =
    useMemo(
      () =>
        applications.find(
          (application) =>
            application.id ===
            selectedId
        ),
      [
        applications,
        selectedId,
      ]
    );

  const filteredApplications =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return applications.filter(
        (application) => {
          const matchesFilter =
            filter === "All" ||
            application.status ===
              filter;

          const matchesSearch =
            !query ||
            [
              application.id,
              application.applicationCode,
              application.businessName,
              application.representativeName,
              application.email,
              application.phone,
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
      applications,
      filter,
      search,
    ]);

  const counts =
    useMemo(
      () => ({
        all:
          applications.length,
        pending:
          applications.filter(
            (item) =>
              item.status ===
              "Pending"
          ).length,
        approved:
          applications.filter(
            (item) =>
              item.status ===
              "Approved"
          ).length,
        rejected:
          applications.filter(
            (item) =>
              item.status ===
              "Rejected"
          ).length,
      }),
      [applications]
    );

  const reviewSelected =
    async (
      decision:
        | "approve"
        | "reject",
      reason?: string
    ) => {
      if (
        !selectedApplication ||
        selectedApplication.status !==
          "Pending" ||
        reviewing
      ) {
        return false;
      }

      setReviewing(true);

      try {
        const { error } =
          await supabase.rpc(
            "review_business_application",
            {
              requested_application_id:
                selectedApplication.id,
              requested_decision:
                decision,
              requested_rejection_reason:
                reason?.trim() ||
                null,
            }
          );

        if (error) {
          throw error;
        }

        await loadApplications();
        window.dispatchEvent(
          new Event("cargo:applications-changed")
        );

        return true;
      } catch (error) {
        console.error(
          "Unable to review business application:",
          error
        );

        window.alert(
          error instanceof Error
            ? error.message
            : "Unable to review the application."
        );

        return false;
      } finally {
        setReviewing(false);
      }
    };

  const approveSelected =
    async () => {
      if (
        !selectedApplication ||
        selectedApplication.status !==
          "Pending"
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Approve ${selectedApplication.businessName}?\n\nAn active business record will be created and the application will become visible to the owner.`
        );

      if (!confirmed) {
        return;
      }

      const success =
        await reviewSelected(
          "approve"
        );

      if (success) {
        window.alert(
          "Business application approved successfully."
        );
      }
    };

  const openReject = () => {
    if (
      !selectedApplication ||
      selectedApplication.status !==
        "Pending"
    ) {
      return;
    }

    setRejectionReason("");
    setRejectVisible(true);
  };

  const confirmReject =
    async () => {
      if (
        !selectedApplication ||
        reviewing
      ) {
        return;
      }

      if (
        rejectionReason.trim()
          .length < 8
      ) {
        window.alert(
          "Please enter a clear rejection reason."
        );
        return;
      }

      const success =
        await reviewSelected(
          "reject",
          rejectionReason
        );

      if (!success) {
        return;
      }

      setRejectVisible(false);
      setRejectionReason("");

      window.alert(
        "Business application rejected. The reason is now visible to the business owner."
      );
    };

  const viewDocument =
    async (
      document:
        BusinessDocument
    ) => {
      if (!document.filePath) {
        window.alert(
          "No uploaded file was found for this document."
        );
        return;
      }

      const {
        data,
        error,
      } = await supabase.storage
        .from("business-documents")
        .createSignedUrl(
          document.filePath,
          300
        );

      if (error) {
        window.alert(
          `Unable to open document: ${error.message}`
        );
        return;
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    };
  return (
    <div style={styles.page}>
      {/* PAGE HEADER */}
      <div
        style={
          styles.pageHeader
        }
      >
        <div>
          <div
            style={
              styles.eyebrow
            }
          >
            ADMIN PORTAL
          </div>

          <h1
            style={
              styles.pageTitle
            }
          >
            Business Applications
          </h1>

          <p
            style={
              styles.pageSubtitle
            }
          >
            Review cargo company
            registrations before
            they become public in
            Cargo Track PH.
          </p>
        </div>

        <button
          style={
            styles.headerBadge
          }
          onClick={() =>
            void loadApplications()
          }
          disabled={loading}
        >
          <RefreshCw
            size={19}
          />

          <span>
            {loading
              ? "Loading..."
              : "Refresh Data"}
          </span>
        </button>
      </div>

      {/* STATS */}
      <div
        style={
          styles.statsGrid
        }
      >
        <StatCard
          label="Total Applications"
          value={counts.all}
          icon={FileCheck2}
          tone="blue"
        />

        <StatCard
          label="Pending Review"
          value={
            counts.pending
          }
          icon={Clock3}
          tone="warning"
        />

        <StatCard
          label="Approved"
          value={
            counts.approved
          }
          icon={BadgeCheck}
          tone="success"
        />

        <StatCard
          label="Rejected"
          value={
            counts.rejected
          }
          icon={XCircle}
          tone="danger"
        />
      </div>

      {/* TOOLBAR */}
      <div
        style={
          styles.toolbar
        }
      >
        <div
          style={
            styles.searchBox
          }
        >
          <Search
            size={18}
            color={
              COLORS.muted
            }
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search business, representative, email, or application ID"
            style={
              styles.searchInput
            }
          />
        </div>

        <div
          style={
            styles.filterWrap
          }
        >
          <Filter
            size={17}
            color={
              COLORS.blue
            }
          />

          {(
            [
              "All",
              "Pending",
              "Approved",
              "Rejected",
            ] as const
          ).map((item) => (
            <button
              key={item}
              onClick={() =>
                setFilter(item)
              }
              style={{
                ...styles.filterButton,
                ...(filter === item
                  ? styles.filterButtonActive
                  : {}),
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
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
              Registration Queue
            </div>

            <div
              style={
                styles.tableSubtitle
              }
            >
              {
                filteredApplications.length
              }{" "}
              application
              {filteredApplications.length ===
              1
                ? ""
                : "s"}{" "}
              shown
            </div>
          </div>

          <div
            style={
              styles.liveReviewBadge
            }
          >
            <span
              style={
                styles.liveDot
              }
            />
            Live Supabase Data
          </div>
        </div>

        <div
          style={
            styles.tableScroll
          }
        >
          <table
            style={
              styles.table
            }
          >
            <thead>
              <tr>
                <th
                  style={
                    styles.th
                  }
                >
                  Business
                </th>
                <th
                  style={
                    styles.th
                  }
                >
                  Representative
                </th>
                <th
                  style={
                    styles.th
                  }
                >
                  Submitted
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
              {filteredApplications.map(
                (
                  application
                ) => (
                  <ApplicationRow
                    key={
                      application.id
                    }
                    application={
                      application
                    }
                    onView={() =>
                      setSelectedId(
                        application.id
                      )
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredApplications.length ===
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
              {loading
                ? "Loading applications..."
                : pageError
                ? "Unable to load applications"
                : "No applications found"}
            </div>

            <div
              style={
                styles.emptyText
              }
            >
              {pageError ||
                (loading
                  ? "Please wait while the registration queue is loaded."
                  : "Try another search or status filter.")}
            </div>
          </div>
        )}
      </div>

      {/* PROTOTYPE NOTICE */}
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
            {pageError
              ? "Supabase connection error"
              : "Connected to Supabase"}
          </div>

          <div
            style={
              styles.prototypeNoticeText
            }
          >
            {pageError ||
              "Applications and review decisions are stored in the shared backend. Approved applications automatically create an active business record, while rejection reasons become visible to the business owner."}
          </div>
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedApplication && (
        <div
          style={
            styles.modalBackdrop
          }
          onMouseDown={(event) => {
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
                    selectedApplication.applicationCode
                  }
                </div>

                <div
                  style={
                    styles.modalTitle
                  }
                >
                  {
                    selectedApplication.businessName
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
                <X
                  size={20}
                />
              </button>
            </div>

            <div
              style={
                styles.modalBody
              }
            >
              <ApplicationStatusHero
                application={
                  selectedApplication
                }
              />

              <SectionTitle
                title="Business Information"
                subtitle="Submitted company and representative information"
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
                  label="Business Name"
                  value={
                    selectedApplication.businessName
                  }
                />

                <InfoCard
                  icon={
                    UserRound
                  }
                  label="Representative"
                  value={
                    selectedApplication.representativeName
                  }
                />

                <InfoCard
                  icon={Mail}
                  label="Email"
                  value={
                    selectedApplication.email
                  }
                />

                <InfoCard
                  icon={Phone}
                  label="Contact"
                  value={
                    selectedApplication.phone
                  }
                />
              </div>

              <div
                style={
                  styles.descriptionCard
                }
              >
                <div
                  style={
                    styles.descriptionLabel
                  }
                >
                  BUSINESS DESCRIPTION
                </div>

                <div
                  style={
                    styles.descriptionText
                  }
                >
                  {
                    selectedApplication.description
                  }
                </div>
              </div>

              <SectionTitle
                title="Puerto Princesa Branch"
                subtitle="Exact branch / warehouse pin submitted by the business"
              />

              <div
                style={
                  styles.branchCard
                }
              >
                <div
                  style={
                    styles.branchIcon
                  }
                >
                  <MapPin
                    size={21}
                  />
                </div>

                <div>
                  <div
                    style={
                      styles.branchAddress
                    }
                  >
                    {
                      selectedApplication.branchAddress
                    }
                  </div>

                  <div
                    style={
                      styles.coordinates
                    }
                  >
                    {
                      selectedApplication.branchLatitude
                    }
                    ,{" "}
                    {
                      selectedApplication.branchLongitude
                    }
                  </div>
                </div>
              </div>

              <SectionTitle
                title="Submitted Documents"
                subtitle="Private files accessible only to the applicant and authorized administrators"
              />

              <div
                style={
                  styles.documentList
                }
              >
                {selectedApplication.documents.map(
                  (
                    document
                  ) => (
                    <div
                      key={
                        document.id
                      }
                      style={
                        styles.documentRow
                      }
                    >
                      <div
                        style={
                          styles.documentIcon
                        }
                      >
                        <FileText
                          size={19}
                        />
                      </div>

                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <div
                          style={
                            styles.documentTitle
                          }
                        >
                          {
                            document.label
                          }
                        </div>

                        <div
                          style={
                            styles.documentMeta
                          }
                        >
                          {document.required
                            ? "Required"
                            : "Optional"}{" "}
                          •{" "}
                          {document.uploaded
                            ? "Uploaded"
                            : "Not uploaded"}
                          {document.originalName
                            ? ` • ${document.originalName}`
                            : ""}
                        </div>
                      </div>

                      <div
                        style={{
                          ...styles.documentState,
                          ...(document.uploaded
                            ? styles.documentStateUploaded
                            : styles.documentStateMissing),
                        }}
                      >
                        {document.uploaded ? (
                          <>
                            <Check
                              size={14}
                            />
                            Ready
                          </>
                        ) : (
                          "Missing"
                        )}
                      </div>

                      {document.uploaded && (
                        <button
                          style={
                            styles.documentViewButton
                          }
                          onClick={() =>
                            void viewDocument(
                              document
                            )
                          }
                        >
                          <Eye
                            size={14}
                          />
                          View File
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>

              <SectionTitle
                title="Public Profile Media"
                subtitle="Logo and cover prepared for the customer-facing company profile"
              />

              <div
                style={
                  styles.mediaGrid
                }
              >
                <MediaPlaceholder
                  label="Company Logo"
                  value="Submitted company logo"
                  imageUrl={
                    selectedApplication.logoUrl
                  }
                  square
                />

                <MediaPlaceholder
                  label="Cover Photo"
                  value="Submitted company cover"
                  imageUrl={
                    selectedApplication.coverUrl
                  }
                />
              </div>

              {selectedApplication.status ===
                "Rejected" &&
                selectedApplication.rejectionReason && (
                  <div
                    style={
                      styles.rejectionCard
                    }
                  >
                    <XCircle
                      size={20}
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
                          selectedApplication.rejectionReason
                        }
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
              {selectedApplication.status ===
              "Pending" ? (
                <>
                  <button
                    style={{
                      ...styles.secondaryButton,
                      opacity:
                        reviewing
                          ? 0.6
                          : 1,
                    }}
                    onClick={
                      openReject
                    }
                    disabled={reviewing}
                  >
                    <XCircle
                      size={18}
                    />
                    Reject
                  </button>

                  <button
                    style={{
                      ...styles.approveButton,
                      opacity:
                        reviewing
                          ? 0.6
                          : 1,
                    }}
                    onClick={
                      approveSelected
                    }
                    disabled={reviewing}
                  >
                    <BadgeCheck
                      size={18}
                    />
                    {reviewing
                      ? "Saving..."
                      : "Approve Business"}
                  </button>
                </>
              ) : (
                <button
                  style={
                    styles.cancelButton
                  }
                  onClick={() =>
                    setSelectedId(
                      null
                    )
                  }
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectVisible &&
        selectedApplication && (
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
                  styles.rejectIcon
                }
              >
                <XCircle
                  size={26}
                />
              </div>

              <div
                style={
                  styles.rejectTitle
                }
              >
                Reject Application
              </div>

              <div
                style={
                  styles.rejectText
                }
              >
                Explain what the
                business needs to
                correct before
                resubmitting.
              </div>

              <label
                style={
                  styles.rejectLabel
                }
              >
                Rejection Reason
              </label>

              <textarea
                value={
                  rejectionReason
                }
                onChange={(event) =>
                  setRejectionReason(
                    event.target.value
                  )
                }
                placeholder="Example: Business permit image is unclear. Please upload a readable copy."
                style={
                  styles.rejectTextarea
                }
              />

              <div
                style={
                  styles.rejectActions
                }
              >
                <button
                  style={
                    styles.cancelButton
                  }
                  onClick={() => {
                    setRejectVisible(
                      false
                    );
                    setRejectionReason(
                      ""
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  style={{
                    ...styles.confirmRejectButton,
                    opacity:
                      reviewing
                        ? 0.6
                        : 1,
                  }}
                  onClick={
                    confirmReject
                  }
                  disabled={reviewing}
                >
                  {reviewing
                    ? "Saving..."
                    : "Reject Application"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function ApplicationRow({
  application,
  onView,
}: {
  application:
    BusinessApplication;
  onView: () => void;
}) {
  const config =
    statusConfig(
      application.status
    );

  const StatusIcon =
    config.icon;

  return (
    <tr>
      <td
        style={
          styles.td
        }
      >
        <div
          style={
            styles.businessCell
          }
        >
          <div
            style={
              styles.businessAvatar
            }
          >
            <Building2
              size={20}
            />
          </div>

          <div>
            <div
              style={
                styles.businessName
              }
            >
              {
                application.businessName
              }
            </div>

            <div
              style={
                styles.applicationId
              }
            >
              {application.applicationCode}
            </div>
          </div>
        </div>
      </td>

      <td
        style={
          styles.td
        }
      >
        <div
          style={
            styles.representativeName
          }
        >
          {
            application.representativeName
          }
        </div>

        <div
          style={
            styles.cellSecondary
          }
        >
          {application.email}
        </div>
      </td>

      <td
        style={
          styles.td
        }
      >
        <div
          style={
            styles.dateValue
          }
        >
          {formatDateTime(
            application.submittedAt
          )}
        </div>
      </td>

      <td
        style={
          styles.td
        }
      >
        <span
          style={{
            ...styles.statusPill,
            color:
              config.color,
            background:
              config.background,
          }}
        >
          <StatusIcon
            size={14}
          />
          {application.status}
        </span>
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
          <Eye
            size={16}
          />
          View
        </button>
      </td>
    </tr>
  );
}

function ApplicationStatusHero({
  application,
}: {
  application:
    BusinessApplication;
}) {
  const config =
    statusConfig(
      application.status
    );

  const StatusIcon =
    config.icon;

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
        <StatusIcon
          size={25}
        />
      </div>

      <div
        style={{
          flex: 1,
        }}
      >
        <div
          style={
            styles.statusHeroLabel
          }
        >
          APPLICATION STATUS
        </div>

        <div
          style={{
            ...styles.statusHeroTitle,
            color:
              config.color,
          }}
        >
          {application.status}
        </div>

        <div
          style={
            styles.statusHeroText
          }
        >
          Submitted{" "}
          {formatDateTime(
            application.submittedAt
          )}
          {application.reviewedAt
            ? ` • Reviewed ${formatDateTime(
                application.reviewedAt
              )}`
            : ""}
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
        styles.sectionHeader
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

function MediaPlaceholder({
  label,
  value,
  imageUrl,
  square = false,
}: {
  label: string;
  value: string;
  imageUrl: string;
  square?: boolean;
}) {
  return (
    <div
      style={{
        ...styles.mediaCard,
        ...(square
          ? styles.mediaCardSquare
          : {}),
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          style={{
            ...styles.mediaPreview,
            ...(square
              ? styles.mediaPreviewSquare
              : {}),
          }}
        />
      ) : (
        <div
          style={
            styles.mediaIcon
          }
        >
          <Building2
            size={25}
          />
        </div>
      )}

      <div
        style={
          styles.mediaLabel
        }
      >
        {label}
      </div>

      <div
        style={
          styles.mediaValue
        }
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  tone:
    | "blue"
    | "warning"
    | "success"
    | "danger";
}) {
  const toneMap = {
    blue: {
      foreground:
        COLORS.blue,
      background:
        COLORS.lightBlue,
    },
    warning: {
      foreground:
        COLORS.warning,
      background:
        "#FFF7ED",
    },
    success: {
      foreground:
        COLORS.success,
      background:
        "#F0FDF4",
    },
    danger: {
      foreground:
        COLORS.danger,
      background:
        "#FFF1F2",
    },
  } as const;

  const colors =
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
          color:
            colors.foreground,
          background:
            colors.background,
        }}
      >
        <Icon
          size={21}
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

const styles: Record<
  string,
  CSSProperties
> = {
  page: {
    minHeight: "100%",
    color: COLORS.text,
  },

  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: 24,
    marginBottom: 24,
  },

  eyebrow: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  pageTitle: {
    margin: "5px 0 0",
    color: COLORS.navy,
    fontSize: 30,
    lineHeight: 1.15,
    fontWeight: 900,
  },

  pageSubtitle: {
    margin:
      "7px 0 0",
    maxWidth: 650,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 1.6,
  },

  headerBadge: {
    minHeight: 42,
    borderRadius: 13,
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: COLORS.blue,
    background:
      COLORS.lightBlue,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
    border: "none",
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 18,
  },

  statCard: {
    minHeight: 104,
    borderRadius: 18,
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    padding: 16,
    display: "flex",
    alignItems: "center",
    gap: 13,
    boxShadow:
      "0 8px 28px rgba(15, 23, 42, 0.04)",
  },

  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
  },

  statValue: {
    color: COLORS.navy,
    fontSize: 25,
    fontWeight: 900,
    lineHeight: 1,
  },

  statLabel: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: 700,
  },

  toolbar: {
    borderRadius: 18,
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    padding: 13,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
    marginBottom: 16,
  },

  searchBox: {
    flex: 1,
    minWidth: 260,
    minHeight: 44,
    borderRadius: 13,
    border:
      `1px solid ${COLORS.border}`,
    background:
      "#FBFCFD",
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  searchInput: {
    flex: 1,
    width: "100%",
    border: "none",
    outline: "none",
    background:
      "transparent",
    color: COLORS.text,
    fontSize: 12,
  },

  filterWrap: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },

  filterButton: {
    minHeight: 34,
    borderRadius: 10,
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    color: COLORS.muted,
    padding: "0 11px",
    fontSize: 10,
    fontWeight: 800,
    cursor: "pointer",
  },

  filterButtonActive: {
    borderColor:
      COLORS.blue,
    background:
      COLORS.lightBlue,
    color: COLORS.blue,
  },

  tableCard: {
    overflow: "hidden",
    borderRadius: 20,
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    boxShadow:
      "0 10px 30px rgba(15, 23, 42, 0.04)",
  },

  tableHeader: {
    minHeight: 76,
    padding:
      "16px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
    borderBottom:
      `1px solid ${COLORS.border}`,
  },

  tableTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: 900,
  },

  tableSubtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 10,
  },

  liveReviewBadge: {
    minHeight: 30,
    borderRadius: 15,
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    background:
      "#F0FDF4",
    color: COLORS.success,
    fontSize: 9,
    fontWeight: 900,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background:
      COLORS.success,
  },

  tableScroll: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: 850,
    borderCollapse:
      "collapse",
  },

  th: {
    padding:
      "12px 16px",
    textAlign: "left",
    background:
      "#FAFCFD",
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform:
      "uppercase",
    borderBottom:
      `1px solid ${COLORS.border}`,
  },

  thAction: {
    padding:
      "12px 16px",
    textAlign: "right",
    background:
      "#FAFCFD",
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform:
      "uppercase",
    borderBottom:
      `1px solid ${COLORS.border}`,
  },

  td: {
    padding:
      "14px 16px",
    borderBottom:
      `1px solid ${COLORS.border}`,
    verticalAlign: "middle",
  },

  tdAction: {
    padding:
      "14px 16px",
    borderBottom:
      `1px solid ${COLORS.border}`,
    verticalAlign: "middle",
    textAlign: "right",
  },

  businessCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  businessAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
    color: COLORS.blue,
    background:
      COLORS.lightBlue,
    flexShrink: 0,
  },

  businessName: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: 900,
  },

  applicationId: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 9,
  },

  representativeName: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 800,
  },

  cellSecondary: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 9,
  },

  dateValue: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: 700,
  },

  statusPill: {
    display:
      "inline-flex",
    alignItems: "center",
    gap: 5,
    minHeight: 28,
    borderRadius: 14,
    padding: "0 9px",
    fontSize: 9,
    fontWeight: 900,
  },

  viewButton: {
    minHeight: 34,
    borderRadius: 10,
    border:
      `1px solid ${COLORS.blue}`,
    background:
      COLORS.white,
    color: COLORS.blue,
    padding: "0 11px",
    display:
      "inline-flex",
    alignItems: "center",
    justifyContent:
      "center",
    gap: 5,
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  emptyState: {
    minHeight: 220,
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
    gap: 6,
    color: COLORS.muted,
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: 900,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 10,
  },

  prototypeNotice: {
    marginTop: 16,
    borderRadius: 16,
    border:
      "1px solid #F3D2AD",
    background:
      "#FFF7ED",
    padding: 13,
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
  },

  prototypeNoticeTitle: {
    color: "#9A5A35",
    fontSize: 10,
    fontWeight: 900,
  },

  prototypeNoticeText: {
    marginTop: 3,
    maxWidth: 850,
    color: "#9A5A35",
    fontSize: 9,
    lineHeight: 1.55,
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background:
      "rgba(15, 23, 42, 0.52)",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    padding: 22,
  },

  detailsModal: {
    width: "min(940px, 96vw)",
    maxHeight: "92vh",
    overflow: "hidden",
    borderRadius: 22,
    background:
      COLORS.white,
    boxShadow:
      "0 24px 80px rgba(15, 23, 42, 0.24)",
    display: "flex",
    flexDirection:
      "column",
  },

  modalHeader: {
    minHeight: 76,
    padding:
      "16px 18px",
    borderBottom:
      `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
  },

  modalEyebrow: {
    color: COLORS.blue,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 0.7,
  },

  modalTitle: {
    marginTop: 3,
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: 900,
  },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    color: COLORS.navy,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },

  modalBody: {
    overflowY: "auto",
    padding: 18,
  },

  statusHero: {
    borderRadius: 17,
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  statusHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    background:
      COLORS.white,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  statusHeroLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 0.6,
  },

  statusHeroTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: 900,
  },

  statusHeroText: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 9,
  },

  sectionHeader: {
    marginTop: 20,
    marginBottom: 9,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: 900,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 9,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  infoCard: {
    borderRadius: 14,
    border:
      `1px solid ${COLORS.border}`,
    background:
      "#FBFCFD",
    padding: 11,
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    background:
      COLORS.lightBlue,
    color: COLORS.blue,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  infoLabel: {
    color: COLORS.muted,
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform:
      "uppercase",
  },

  infoValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 800,
  },

  descriptionCard: {
    marginTop: 10,
    borderRadius: 14,
    border:
      `1px solid ${COLORS.border}`,
    background:
      "#FBFCFD",
    padding: 12,
  },

  descriptionLabel: {
    color: COLORS.muted,
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 0.5,
  },

  descriptionText: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: 10,
    lineHeight: 1.6,
  },

  branchCard: {
    borderRadius: 15,
    background:
      COLORS.lightBlue,
    padding: 12,
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  branchIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background:
      COLORS.white,
    color: COLORS.blue,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  branchAddress: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: 900,
  },

  coordinates: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 8,
  },

  documentList: {
    borderRadius: 15,
    border:
      `1px solid ${COLORS.border}`,
    overflow: "hidden",
  },

  documentRow: {
    minHeight: 64,
    padding:
      "10px 12px",
    borderBottom:
      `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  documentIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background:
      COLORS.lightBlue,
    color: COLORS.blue,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  documentTitle: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: 900,
  },

  documentMeta: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 8,
  },

  documentState: {
    minHeight: 27,
    borderRadius: 14,
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 8,
    fontWeight: 900,
  },

  documentStateUploaded: {
    color: COLORS.success,
    background:
      "#F0FDF4",
  },

  documentStateMissing: {
    color: COLORS.muted,
    background:
      "#F1F5F9",
  },

  documentViewButton: {
    minHeight: 30,
    borderRadius: 9,
    border:
      `1px solid ${COLORS.blue}`,
    background:
      COLORS.white,
    color: COLORS.blue,
    padding: "0 9px",
    display:
      "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 8,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  mediaGrid: {
    display: "grid",
    gridTemplateColumns:
      "180px minmax(0, 1fr)",
    gap: 10,
  },

  mediaCard: {
    minHeight: 150,
    borderRadius: 15,
    border:
      `1px dashed #B7CFDC`,
    background:
      "#FAFCFD",
    padding: 14,
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
    textAlign: "center",
  },

  mediaCardSquare: {
    minHeight: 150,
  },

  mediaIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    background:
      COLORS.lightBlue,
    color: COLORS.blue,
    display: "grid",
    placeItems: "center",
  },

  mediaPreview: {
    width: "100%",
    height: 92,
    borderRadius: 11,
    objectFit: "cover",
    border:
      `1px solid ${COLORS.border}`,
  },

  mediaPreviewSquare: {
    width: 88,
    height: 88,
  },

  mediaLabel: {
    marginTop: 9,
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: 900,
  },

  mediaValue: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 8,
  },

  rejectionCard: {
    marginTop: 16,
    borderRadius: 15,
    border:
      "1px solid #F2C5C5",
    background:
      "#FFF1F2",
    padding: 12,
    color: COLORS.danger,
    display: "flex",
    alignItems:
      "flex-start",
    gap: 8,
  },

  rejectionTitle: {
    color: COLORS.danger,
    fontSize: 9,
    fontWeight: 900,
  },

  rejectionText: {
    marginTop: 3,
    color: "#9F3434",
    fontSize: 9,
    lineHeight: 1.55,
  },

  modalFooter: {
    minHeight: 76,
    padding:
      "13px 18px",
    borderTop:
      `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "flex-end",
    gap: 9,
  },

  secondaryButton: {
    minHeight: 42,
    borderRadius: 12,
    border:
      "1px solid #F0BFC3",
    background:
      "#FFF7F7",
    color: COLORS.danger,
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  approveButton: {
    minHeight: 42,
    borderRadius: 12,
    border: "none",
    background:
      COLORS.success,
    color: COLORS.white,
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  rejectModal: {
    width: "min(520px, 94vw)",
    borderRadius: 20,
    background:
      COLORS.white,
    padding: 20,
    boxShadow:
      "0 24px 80px rgba(15, 23, 42, 0.24)",
  },

  rejectIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background:
      "#FFF1F2",
    color: COLORS.danger,
    display: "grid",
    placeItems: "center",
  },

  rejectTitle: {
    marginTop: 13,
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: 900,
  },

  rejectText: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 1.55,
  },

  rejectLabel: {
    display: "block",
    marginTop: 16,
    marginBottom: 6,
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: 900,
  },

  rejectTextarea: {
    width: "100%",
    minHeight: 120,
    resize: "vertical",
    borderRadius: 13,
    border:
      `1px solid ${COLORS.border}`,
    background:
      "#FBFCFD",
    color: COLORS.text,
    padding: 11,
    outline: "none",
    fontSize: 10,
    lineHeight: 1.55,
    boxSizing:
      "border-box",
  },

  rejectActions: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "flex-end",
    gap: 8,
  },

  cancelButton: {
    minHeight: 40,
    borderRadius: 11,
    border:
      `1px solid ${COLORS.border}`,
    background:
      COLORS.white,
    color: COLORS.muted,
    padding: "0 13px",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  confirmRejectButton: {
    minHeight: 40,
    borderRadius: 11,
    border: "none",
    background:
      COLORS.danger,
    color: COLORS.white,
    padding: "0 14px",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },
};
