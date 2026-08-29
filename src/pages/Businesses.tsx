import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  Search,
  X,
} from "lucide-react";

type BusinessStatus = "Active" | "Suspended";

type Business = {
  id: string;
  sourceApplicationId?: string;
  name: string;
  representative: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  status: BusinessStatus;
  approvedDate: string;
  destinations: string[];
  cargoTypes: string[];
  shipments: number;
  rates: number;
};

type ApprovedApplication = {
  id: string;
  businessName: string;
  representativeName: string;
  email: string;
  phone: string;
  description: string;
  branchAddress: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  reviewedAt?: string;
};

const APPLICATIONS_STORAGE_KEY =
  "cargo-track-admin-business-applications-v1";

const BUSINESSES_STORAGE_KEY =
  "cargo-track-admin-businesses-v1";

const initialBusinesses: Business[] = [
  {
    id: "BUS-001",
    name: "ABC Cargo Express",
    representative: "Michael Santos",
    email: "abccargo@example.com",
    phone: "0917 123 4567",
    address: "Puerto Princesa City, Palawan",
    description:
      "Cargo transport services serving Manila, Cebu, and Davao.",
    status: "Active",
    approvedDate: "Aug 10, 2026",
    destinations: ["Manila", "Cebu", "Davao"],
    cargoTypes: [
      "General Cargo",
      "Documents",
      "Live Animals",
      "Live Fish & Marine Products",
    ],
    shipments: 32,
    rates: 12,
  },
  {
    id: "BUS-002",
    name: "XYZ Cargo Services",
    representative: "Leonardo Cruz",
    email: "xyzcargo@example.com",
    phone: "0918 222 3344",
    address: "Puerto Princesa City, Palawan",
    description:
      "Freight and document cargo services between Palawan and major destinations.",
    status: "Active",
    approvedDate: "Aug 8, 2026",
    destinations: ["Manila", "Cebu"],
    cargoTypes: ["General Cargo", "Documents"],
    shipments: 21,
    rates: 4,
  },
  {
    id: "BUS-003",
    name: "Palawan Cargo Lines",
    representative: "Andrea Reyes",
    email: "palawancargo@example.com",
    phone: "0919 333 4455",
    address: "Puerto Princesa City, Palawan",
    description:
      "Cargo transport specializing in general freight and marine products.",
    status: "Active",
    approvedDate: "Aug 5, 2026",
    destinations: ["Manila", "Davao"],
    cargoTypes: [
      "General Cargo",
      "Live Fish & Marine Products",
    ],
    shipments: 18,
    rates: 4,
  },
  {
    id: "BUS-004",
    name: "Island Freight Palawan",
    representative: "Paolo Mendoza",
    email: "islandfreight@example.com",
    phone: "0920 555 6677",
    address: "Puerto Princesa City, Palawan",
    description:
      "Inter-island freight services for general cargo and live animals.",
    status: "Suspended",
    approvedDate: "Jul 29, 2026",
    destinations: ["Cebu", "Davao"],
    cargoTypes: ["General Cargo", "Live Animals"],
    shipments: 10,
    rates: 4,
  },
];

function formatApprovedDate(value?: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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

function applicationToBusiness(
  application: ApprovedApplication
): Business {
  return {
    id: `BUS-${application.id.replace(/^APP-/, "")}`,
    sourceApplicationId: application.id,
    name: application.businessName,
    representative: application.representativeName,
    email: application.email,
    phone: application.phone,
    address: application.branchAddress,
    description: application.description,
    status: "Active",
    approvedDate: formatApprovedDate(
      application.reviewedAt || application.submittedAt
    ),
    destinations: [],
    cargoTypes: [],
    shipments: 0,
    rates: 0,
  };
}

function loadBusinesses(): Business[] {
  let storedBusinesses = initialBusinesses;

  try {
    const raw = window.localStorage.getItem(
      BUSINESSES_STORAGE_KEY
    );

    if (raw) {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        storedBusinesses = parsed as Business[];
      }
    }
  } catch {
    storedBusinesses = initialBusinesses;
  }

  const approvedApplications = readApprovedApplications();
  const approvedIds = new Set(
    approvedApplications.map((application) => application.id)
  );

  const syncedBusinesses = storedBusinesses.filter(
    (business) =>
      !business.sourceApplicationId ||
      approvedIds.has(business.sourceApplicationId)
  );

  approvedApplications.forEach((application) => {
    const existingIndex = syncedBusinesses.findIndex(
      (business) =>
        business.sourceApplicationId === application.id
    );

    const applicationBusiness = applicationToBusiness(application);

    if (existingIndex === -1) {
      syncedBusinesses.push(applicationBusiness);
      return;
    }

    const existingBusiness = syncedBusinesses[existingIndex];

    syncedBusinesses[existingIndex] = {
      ...applicationBusiness,
      status: existingBusiness.status,
      destinations: existingBusiness.destinations,
      cargoTypes: existingBusiness.cargoTypes,
      shipments: existingBusiness.shipments,
      rates: existingBusiness.rates,
    };
  });

  return syncedBusinesses;
}

const filters = ["All", "Active", "Suspended"] as const;
type Filter = (typeof filters)[number];

export default function Businesses() {
  const [businesses, setBusinesses] =
    useState<Business[]>(() => loadBusinesses());

  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<Filter>("All");

  const [selectedBusiness, setSelectedBusiness] =
    useState<Business | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      BUSINESSES_STORAGE_KEY,
      JSON.stringify(businesses)
    );
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return businesses.filter((business) => {
      const matchesFilter =
        selectedFilter === "All" ||
        business.status === selectedFilter;

      const matchesSearch =
        !query ||
        business.name.toLowerCase().includes(query) ||
        business.representative.toLowerCase().includes(query) ||
        business.email.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [businesses, search, selectedFilter]);

  const activeCount = businesses.filter(
    (business) => business.status === "Active"
  ).length;

  const suspendedCount = businesses.filter(
    (business) => business.status === "Suspended"
  ).length;

  const updateStatus = (status: BusinessStatus) => {
    if (!selectedBusiness) return;

    setBusinesses((current) =>
      current.map((business) =>
        business.id === selectedBusiness.id
          ? { ...business, status }
          : business
      )
    );

    setSelectedBusiness({
      ...selectedBusiness,
      status,
    });
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">REGISTERED COMPANIES</p>
          <h2>Businesses</h2>
          <p className="page-description">
            Monitor approved cargo businesses and account status.
          </p>
        </div>

        <div className="business-header-badge">
          <BriefcaseBusiness size={17} />
          <span>{businesses.length} Registered</span>
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
              placeholder="Search business, representative, or email..."
            />

            {search && (
              <button onClick={() => setSearch("")}>
                <X size={17} />
              </button>
            )}
          </div>

          <div className="business-filters">
            {filters.map((filter) => (
              <button
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

        <div className="business-table-wrap">
          <table className="business-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Representative</th>
                <th>Destinations</th>
                <th>Shipments</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredBusinesses.map((business) => (
                <tr key={business.id}>
                  <td>
                    <div className="business-company-cell">
                      <div className="business-table-logo">
                        <BriefcaseBusiness size={20} />
                      </div>

                      <div>
                        <strong>{business.name}</strong>
                        <span>{business.id}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="business-contact-cell">
                      <strong>{business.representative}</strong>
                      <span>{business.email}</span>
                    </div>
                  </td>

                  <td>
                    <div className="business-destination-count">
                      <MapPin size={14} />
                      {business.destinations.length}
                    </div>
                  </td>

                  <td>{business.shipments}</td>

                  <td>
                    <BusinessStatusBadge status={business.status} />
                  </td>

                  <td className="business-action-cell">
                    <button
                      className="view-business-button"
                      onClick={() => setSelectedBusiness(business)}
                    >
                      <Eye size={16} />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}

              {filteredBusinesses.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="businesses-empty">
                      <BriefcaseBusiness size={34} />
                      <strong>No businesses found</strong>
                      <span>
                        Try changing your search or filter.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBusiness && (
        <div className="web-modal-overlay">
          <div className="business-modal">
            <div className="application-modal-header">
              <div>
                <p className="eyebrow">REGISTERED BUSINESS</p>
                <h3>Business Details</h3>
                <span>{selectedBusiness.id}</span>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedBusiness(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="application-modal-body">
              <div className="business-detail-hero">
                <div className="business-detail-logo">
                  <BriefcaseBusiness size={28} />
                </div>

                <div>
                  <h3>{selectedBusiness.name}</h3>
                  <p>{selectedBusiness.representative}</p>
                </div>

                <BusinessStatusBadge
                  status={selectedBusiness.status}
                />
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

              <div className="application-detail-section">
                <h4>Destinations</h4>

                <div className="application-tags">
                  {selectedBusiness.destinations.length > 0 ? (
                    selectedBusiness.destinations.map((destination) => (
                      <span
                        className="application-tag blue-tag"
                        key={destination}
                      >
                        <MapPin size={13} />
                        {destination}
                      </span>
                    ))
                  ) : (
                    <span className="application-tag blue-tag">
                      Not configured yet
                    </span>
                  )}
                </div>
              </div>

              <div className="application-detail-section">
                <h4>Cargo Types</h4>

                <div className="application-tags">
                  {selectedBusiness.cargoTypes.length > 0 ? (
                    selectedBusiness.cargoTypes.map((cargoType) => (
                      <span className="application-tag" key={cargoType}>
                        {cargoType}
                      </span>
                    ))
                  ) : (
                    <span className="application-tag">
                      Not configured yet
                    </span>
                  )}
                </div>
              </div>

              <div className="business-activity-grid">
                <div>
                  <strong>{selectedBusiness.shipments}</strong>
                  <span>Shipments</span>
                </div>

                <div>
                  <strong>{selectedBusiness.rates}</strong>
                  <span>Listed Rates</span>
                </div>

                <div>
                  <strong>{selectedBusiness.destinations.length}</strong>
                  <span>Destinations</span>
                </div>

                <div>
                  <strong>{selectedBusiness.approvedDate}</strong>
                  <span>Approved</span>
                </div>
              </div>

              <div className="business-permission-note">
                Admin can currently monitor business information and
                account status. Editing rates, destinations, and services
                is intentionally not enabled yet.
              </div>
            </div>

            <div className="application-modal-footer">
              {selectedBusiness.status === "Active" ? (
                <button
                  className="suspend-business-button"
                  onClick={() => updateStatus("Suspended")}
                >
                  <PauseCircle size={18} />
                  Suspend Business
                </button>
              ) : (
                <button
                  className="reactivate-business-button"
                  onClick={() => updateStatus("Active")}
                >
                  <CheckCircle2 size={18} />
                  Reactivate Business
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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
  icon: React.ReactNode;
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

function BusinessStatusBadge({
  status,
}: {
  status: BusinessStatus;
}) {
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
  icon: React.ReactNode;
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
