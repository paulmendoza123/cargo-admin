import { supabase } from "./supabase";

export type AdminDashboardSummary = {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  pendingApplications: number;
  customerAccounts: number;
  businessAccounts: number;
  pendingSponsorships: number;
  pendingIdentityVerifications: number;
  totalBookings: number;
};

export type AdminDashboardApplication = {
  id: string;
  applicationCode: string;
  businessName: string;
  representativeName: string;
  submittedAt: string;
  status: string;
};

export type AdminDashboardBusiness = {
  id: string;
  businessCode: string;
  name: string;
  address: string;
  logoPath?: string;
  logoUrl?: string;
  status: string;
  approvedAt: string;
  destinationsCount: number;
};

export type AdminDashboardData = {
  summary: AdminDashboardSummary;
  pendingApplications: AdminDashboardApplication[];
  recentBusinesses: AdminDashboardBusiness[];
};

type DashboardPayload = {
  summary?: {
    total_businesses?: number | string;
    active_businesses?: number | string;
    suspended_businesses?: number | string;
    pending_applications?: number | string;
    customer_accounts?: number | string;
    business_accounts?: number | string;
    pending_sponsorships?: number | string;
    pending_identity_verifications?: number | string;
    total_bookings?: number | string;
  };
  pending_applications?: Array<{
    id: string;
    application_code: string;
    business_name: string;
    representative_name: string;
    submitted_at: string;
    status: string;
  }>;
  recent_businesses?: Array<{
    id: string;
    business_code: string;
    name: string;
    address: string;
    logo_path: string | null;
    status: string;
    approved_at: string;
    destinations_count: number | string;
  }>;
};

const EMPTY_SUMMARY: AdminDashboardSummary = {
  totalBusinesses: 0,
  activeBusinesses: 0,
  suspendedBusinesses: 0,
  pendingApplications: 0,
  customerAccounts: 0,
  businessAccounts: 0,
  pendingSponsorships: 0,
  pendingIdentityVerifications: 0,
  totalBookings: 0,
};

function numberValue(value?: number | string) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

function publicBusinessAssetUrl(path?: string | null) {
  if (!path) return undefined;

  if (/^https?:\/\//i.test(path)) return path;

  return supabase.storage
    .from("business-assets")
    .getPublicUrl(path).data.publicUrl;
}

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const { data, error } = await supabase.rpc("get_admin_dashboard");

  if (error) {
    throw new Error(
      errorMessage(error, "Unable to load the administrator dashboard.")
    );
  }

  const payload = (data || {}) as DashboardPayload;
  const summary = payload.summary;

  return {
    summary: summary
      ? {
          totalBusinesses: numberValue(summary.total_businesses),
          activeBusinesses: numberValue(summary.active_businesses),
          suspendedBusinesses: numberValue(summary.suspended_businesses),
          pendingApplications: numberValue(summary.pending_applications),
          customerAccounts: numberValue(summary.customer_accounts),
          businessAccounts: numberValue(summary.business_accounts),
          pendingSponsorships: numberValue(summary.pending_sponsorships),
          pendingIdentityVerifications: numberValue(
            summary.pending_identity_verifications
          ),
          totalBookings: numberValue(summary.total_bookings),
        }
      : EMPTY_SUMMARY,
    pendingApplications: (payload.pending_applications || []).map(
      (application) => ({
        id: application.id,
        applicationCode: application.application_code,
        businessName: application.business_name,
        representativeName: application.representative_name,
        submittedAt: application.submitted_at,
        status: application.status,
      })
    ),
    recentBusinesses: (payload.recent_businesses || []).map((business) => ({
      id: business.id,
      businessCode: business.business_code,
      name: business.name,
      address: business.address,
      logoPath: business.logo_path || undefined,
      logoUrl: publicBusinessAssetUrl(business.logo_path),
      status: business.status,
      approvedAt: business.approved_at,
      destinationsCount: numberValue(business.destinations_count),
    })),
  };
}
