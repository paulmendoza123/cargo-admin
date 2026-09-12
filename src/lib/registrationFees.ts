import { supabase } from "./supabase";

export type RegistrationFeeSettings = {
  feeEnabled: boolean;
  feeAmount: number;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  paymentDeadlineDays: number;
  updatedAt: string;
};

export type RegistrationPayment = {
  id: string;
  applicationId: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
  paymentProofPath?: string;
  status: "required" | "pending" | "approved" | "rejected" | "cancelled";
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  paymentDueAt?: string;
};

export type SaveRegistrationFeeSettingsInput = Omit<
  RegistrationFeeSettings,
  "updatedAt"
>;

type SettingsRow = {
  fee_enabled: boolean;
  fee_amount: number | string;
  payment_method: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  payment_deadline_days: number;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  application_id: string;
  amount: number | string;
  payment_method: string;
  payment_reference: string | null;
  payment_proof_path: string | null;
  payment_status: RegistrationPayment["status"];
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  payment_due_at: string | null;
};

function messageOf(error: unknown, fallback: string) {
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

export async function loadRegistrationFeeSettings() {
  const { data, error } = await supabase.rpc(
    "get_admin_business_registration_settings",
  );
  if (error) throw new Error(error.message);
  const row = (data?.[0] || null) as SettingsRow | null;
  if (!row) throw new Error("Registration fee settings are unavailable.");

  return {
    feeEnabled: row.fee_enabled,
    feeAmount: Number(row.fee_amount),
    paymentMethod: row.payment_method,
    accountName: row.account_name,
    accountNumber: row.account_number,
    instructions: row.instructions || "",
    paymentDeadlineDays: Number(row.payment_deadline_days),
    updatedAt: row.updated_at,
  } satisfies RegistrationFeeSettings;
}

export async function saveRegistrationFeeSettings(
  input: SaveRegistrationFeeSettingsInput,
) {
  const { error } = await supabase.rpc(
    "save_admin_business_registration_settings",
    {
      requested_fee_enabled: input.feeEnabled,
      requested_fee_amount: input.feeAmount,
      requested_payment_method: input.paymentMethod.trim(),
      requested_account_name: input.accountName.trim(),
      requested_account_number: input.accountNumber.trim(),
      requested_instructions: input.instructions.trim() || null,
      requested_payment_deadline_days: input.paymentDeadlineDays,
    },
  );
  if (error) {
    throw new Error(messageOf(error, "Unable to save registration fee settings."));
  }
}

export async function loadRegistrationPayments() {
  const { data, error } = await supabase.rpc(
    "get_admin_business_registration_payments",
  );
  if (error) throw new Error(error.message);

  return ((data || []) as PaymentRow[]).map(
    (row): RegistrationPayment => ({
      id: row.id,
      applicationId: row.application_id,
      amount: Number(row.amount),
      paymentMethod: row.payment_method,
      paymentReference: row.payment_reference || undefined,
      paymentProofPath: row.payment_proof_path || undefined,
      status: row.payment_status,
      rejectionReason: row.rejection_reason || undefined,
      submittedAt: row.submitted_at || undefined,
      reviewedAt: row.reviewed_at || undefined,
      paymentDueAt: row.payment_due_at || undefined,
    }),
  );
}

export async function approveRegistrationPayment(paymentId: string) {
  const { error } = await supabase.rpc(
    "approve_business_registration_payment",
    { requested_payment_id: paymentId },
  );
  if (error) throw new Error(error.message);
}

export type BusinessApprovalEmailResult = {
  status: "sent" | "already_sent";
  messageId?: string;
};

export async function sendBusinessApprovalEmail(applicationId: string) {
  const { data, error } = await supabase.functions.invoke(
    "send-business-approval-email",
    { body: { applicationId } },
  );

  if (error) {
    throw new Error(
      messageOf(error, "Unable to send the business approval email."),
    );
  }

  if (
    !data ||
    (data.status !== "sent" && data.status !== "already_sent")
  ) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "The email provider returned an unexpected response.",
    );
  }

  return data as BusinessApprovalEmailResult;
}

export async function rejectRegistrationPayment(paymentId: string, reason: string) {
  const { error } = await supabase.rpc(
    "reject_business_registration_payment",
    { requested_payment_id: paymentId, requested_reason: reason.trim() },
  );
  if (error) throw new Error(error.message);
}

export async function approveApplicationDocuments(applicationId: string) {
  const { data, error } = await supabase.rpc(
    "mark_business_application_documents_approved",
    { requested_application_id: applicationId },
  );
  if (error) throw new Error(error.message);
  return data as "payment_required" | "approved";
}

export async function createRegistrationProofUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("business-registration-proofs")
    .createSignedUrl(storagePath, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function registrationPeso(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}
