import { supabase } from "./supabase";

export type SponsorshipDisplayStatus =
  | "Pending"
  | "Approved"
  | "Scheduled"
  | "Active"
  | "Disabled"
  | "Expired"
  | "Rejected"
  | "Cancelled";

export type AdminSponsorshipRequest = {
  id: string;
  requestCode: string;
  businessId: string;
  businessName: string;
  representativeName: string;
  businessEmail: string;
  businessPhone: string;
  packageId: string;
  packageName: string;
  durationDays: number;
  price: number;
  paymentMethod: string;
  paymentReference: string;
  paymentProofPath: string;
  rawStatus: string;
  status: SponsorshipDisplayStatus;
  rejectionReason?: string;
  requestedAt: string;
  reviewedAt?: string;
  placementId?: string;
  startsAt?: string;
  endsAt?: string;
  placementIsEnabled: boolean;
  placementIsActive: boolean;
};

export type SponsorshipPackage = {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  description: string;
  isActive: boolean;
  updatedAt: string;
};

export type SponsorshipCheckout = {
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  isEnabled: boolean;
  updatedAt: string;
};

export type SaveSponsorshipPackageInput = {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  description: string;
  isActive: boolean;
};

export type SaveSponsorshipCheckoutInput = {
  accountName: string;
  accountNumber: string;
  instructions: string;
  isEnabled: boolean;
};

type SponsorshipRequestRow = {
  id: string;
  request_code: string;
  business_id: string;
  business_name: string;
  representative_name: string;
  business_email: string;
  business_phone: string;
  package_id: string;
  package_name: string;
  duration_days: number;
  price: number | string;
  payment_method: string;
  payment_reference: string;
  payment_proof_path: string;
  request_status: string;
  rejection_reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
  placement_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  placement_is_enabled: boolean | null;
  placement_is_active: boolean | null;
};

type SponsorshipPackageRow = {
  id: string;
  name: string;
  duration_days: number;
  price: number | string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
};

type SponsorshipCheckoutRow = {
  payment_method: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  is_enabled: boolean;
  updated_at: string;
};

function displayStatus(
  row: SponsorshipRequestRow
): SponsorshipDisplayStatus {
  if (row.request_status === "pending") {
    return "Pending";
  }

  if (row.request_status === "rejected") {
    return "Rejected";
  }

  if (row.request_status === "cancelled") {
    return "Cancelled";
  }

  if (row.request_status !== "approved") {
    return "Approved";
  }

  if (!row.placement_id) {
    return "Approved";
  }

  const now = Date.now();
  const startsAt = row.starts_at
    ? new Date(row.starts_at).getTime()
    : 0;
  const endsAt = row.ends_at
    ? new Date(row.ends_at).getTime()
    : 0;

  if (endsAt > 0 && endsAt <= now) {
    return "Expired";
  }

  if (!row.placement_is_enabled) {
    return "Disabled";
  }

  if (startsAt > now) {
    return "Scheduled";
  }

  return row.placement_is_active
    ? "Active"
    : "Approved";
}

function errorMessage(
  error: unknown,
  fallback: string
) {
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

export async function loadAdminSponsorshipRequests() {
  const { data, error } = await supabase.rpc(
    "get_admin_sponsorship_requests"
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to load Premium Listing requests."
      )
    );
  }

  return ((data || []) as SponsorshipRequestRow[]).map(
    (row): AdminSponsorshipRequest => ({
      id: row.id,
      requestCode: row.request_code,
      businessId: row.business_id,
      businessName: row.business_name,
      representativeName: row.representative_name,
      businessEmail: row.business_email,
      businessPhone: row.business_phone,
      packageId: row.package_id,
      packageName: row.package_name,
      durationDays: Number(row.duration_days),
      price: Number(row.price),
      paymentMethod: row.payment_method,
      paymentReference: row.payment_reference,
      paymentProofPath: row.payment_proof_path,
      rawStatus: row.request_status,
      status: displayStatus(row),
      rejectionReason: row.rejection_reason || undefined,
      requestedAt: row.requested_at,
      reviewedAt: row.reviewed_at || undefined,
      placementId: row.placement_id || undefined,
      startsAt: row.starts_at || undefined,
      endsAt: row.ends_at || undefined,
      placementIsEnabled:
        row.placement_is_enabled === true,
      placementIsActive:
        row.placement_is_active === true,
    })
  );
}

export async function loadAdminSponsorshipPackages() {
  const { data, error } = await supabase.rpc(
    "get_admin_sponsorship_packages"
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to load premium packages."
      )
    );
  }

  return ((data || []) as SponsorshipPackageRow[]).map(
    (row): SponsorshipPackage => ({
      id: row.id,
      name: row.name,
      durationDays: Number(row.duration_days),
      price: Number(row.price),
      description: row.description || "",
      isActive: row.is_active,
      updatedAt: row.updated_at,
    })
  );
}

export async function loadAdminSponsorshipCheckout() {
  const { data, error } = await supabase.rpc(
    "get_admin_sponsorship_checkout"
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to load premium checkout settings."
      )
    );
  }

  const row = (data?.[0] || null) as
    | SponsorshipCheckoutRow
    | null;

  if (!row) {
    return null;
  }

  return {
    paymentMethod: row.payment_method,
    accountName: row.account_name,
    accountNumber: row.account_number,
    instructions: row.instructions || "",
    isEnabled: row.is_enabled,
    updatedAt: row.updated_at,
  } satisfies SponsorshipCheckout;
}

export async function approveSponsorshipRequest(
  requestId: string
) {
  const { error } = await supabase.rpc(
    "approve_sponsorship_request",
    {
      requested_sponsorship_id: requestId,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to approve the Premium Listing request."
      )
    );
  }
}

export async function rejectSponsorshipRequest(
  requestId: string,
  reason: string
) {
  const { error } = await supabase.rpc(
    "reject_sponsorship_request",
    {
      requested_sponsorship_id: requestId,
      reason: reason.trim(),
    }
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to reject the Premium Listing request."
      )
    );
  }
}

export async function setSponsoredPlacementEnabled(
  placementId: string,
  isEnabled: boolean
) {
  const { error } = await supabase.rpc(
    "set_sponsored_placement_enabled",
    {
      requested_placement_id: placementId,
      requested_enabled: isEnabled,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to update the premium placement."
      )
    );
  }
}

export async function saveSponsorshipPackage(
  input: SaveSponsorshipPackageInput
) {
  const { error } = await supabase.rpc(
    "save_admin_sponsorship_package",
    {
      requested_package_id: input.id,
      requested_name: input.name.trim(),
      requested_duration_days: input.durationDays,
      requested_price: input.price,
      requested_description:
        input.description.trim() || null,
      requested_is_active: input.isActive,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to save the premium package."
      )
    );
  }
}

export async function saveSponsorshipCheckout(
  input: SaveSponsorshipCheckoutInput
) {
  const { error } = await supabase.rpc(
    "save_admin_sponsorship_checkout",
    {
      requested_account_name: input.accountName.trim(),
      requested_account_number:
        input.accountNumber.trim(),
      requested_instructions:
        input.instructions.trim() || null,
      requested_is_enabled: input.isEnabled,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to save the premium checkout."
      )
    );
  }
}

export async function createPaymentProofUrl(
  storagePath: string
) {
  const { data, error } = await supabase.storage
    .from("sponsorship-proofs")
    .createSignedUrl(storagePath, 300);

  if (error) {
    throw new Error(
      errorMessage(
        error,
        "Unable to open the payment receipt."
      )
    );
  }

  return data.signedUrl;
}
