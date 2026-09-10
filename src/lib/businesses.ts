import { supabase } from "./supabase";

export type BusinessStatus = "Active" | "Suspended";

export type AdminBusiness = {
  id: string;
  businessCode: string;
  ownerId: string;
  applicationId: string;
  name: string;
  representativeName: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  branchLatitude?: number;
  branchLongitude?: number;
  logoPath?: string;
  coverPath?: string;
  logoUrl?: string;
  coverUrl?: string;
  status: BusinessStatus;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
  destinations: string[];
  cargoTypes: string[];
  destinationsCount: number;
  ratesCount: number;
  bookingsCount: number;
  galleryCount: number;
};

export type BusinessStatusHistoryEntry = {
  id: string;
  businessId: string;
  oldStatus?: BusinessStatus;
  newStatus: BusinessStatus;
  changedBy?: string;
  reason?: string;
  changedAt: string;
};

type AdminBusinessRow = {
  id: string;
  business_code: string;
  owner_id: string;
  application_id: string;
  name: string;
  representative_name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  branch_latitude: number | string | null;
  branch_longitude: number | string | null;
  logo_path: string | null;
  cover_path: string | null;
  business_status: string;
  approved_at: string;
  created_at: string;
  updated_at: string;
  destinations: string[] | null;
  cargo_types: string[] | null;
  destinations_count: number | string;
  rates_count: number | string;
  bookings_count: number | string;
  gallery_count: number | string;
};

type BusinessStatusHistoryRow = {
  id: string;
  business_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  changed_at: string;
};

function errorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function displayStatus(status: string): BusinessStatus {
  return status.toLowerCase() === "suspended"
    ? "Suspended"
    : "Active";
}

function publicBusinessAssetUrl(path?: string | null) {
  if (!path) return undefined;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return supabase.storage
    .from("business-assets")
    .getPublicUrl(path).data.publicUrl;
}

export async function loadAdminBusinesses() {
  const { data, error } = await supabase.rpc(
    "get_admin_businesses"
  );

  if (error) {
    throw new Error(
      errorMessage(error, "Unable to load businesses.")
    );
  }

  return ((data || []) as AdminBusinessRow[]).map(
    (row): AdminBusiness => ({
      id: row.id,
      businessCode: row.business_code,
      ownerId: row.owner_id,
      applicationId: row.application_id,
      name: row.name,
      representativeName: row.representative_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      description: row.description,
      branchLatitude:
        row.branch_latitude === null
          ? undefined
          : Number(row.branch_latitude),
      branchLongitude:
        row.branch_longitude === null
          ? undefined
          : Number(row.branch_longitude),
      logoPath: row.logo_path || undefined,
      coverPath: row.cover_path || undefined,
      logoUrl: publicBusinessAssetUrl(row.logo_path),
      coverUrl: publicBusinessAssetUrl(row.cover_path),
      status: displayStatus(row.business_status),
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      destinations: row.destinations || [],
      cargoTypes: row.cargo_types || [],
      destinationsCount: Number(row.destinations_count),
      ratesCount: Number(row.rates_count),
      bookingsCount: Number(row.bookings_count),
      galleryCount: Number(row.gallery_count),
    })
  );
}

export async function loadAdminBusinessStatusHistory(
  businessId: string
) {
  const { data, error } = await supabase.rpc(
    "get_admin_business_status_history",
    {
      requested_business_id: businessId,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to load business status history."
      )
    );
  }

  return ((data || []) as BusinessStatusHistoryRow[]).map(
    (row): BusinessStatusHistoryEntry => ({
      id: row.id,
      businessId: row.business_id,
      oldStatus: row.old_status
        ? displayStatus(row.old_status)
        : undefined,
      newStatus: displayStatus(row.new_status),
      changedBy: row.changed_by || undefined,
      reason: row.reason || undefined,
      changedAt: row.changed_at,
    })
  );
}

export async function setAdminBusinessStatus(
  businessId: string,
  status: BusinessStatus,
  reason: string
) {
  const { error } = await supabase.rpc(
    "set_admin_business_status",
    {
      requested_business_id: businessId,
      requested_status: status.toLowerCase(),
      requested_reason: reason.trim() || null,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        `Unable to ${
          status === "Active" ? "reactivate" : "suspend"
        } this business.`
      )
    );
  }
}
