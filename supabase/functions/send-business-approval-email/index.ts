import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ApprovalRequest = {
  applicationId?: unknown;
};

type BusinessApplication = {
  id: string;
  application_code: string;
  business_name: string;
  representative_name: string;
  email: string;
  status: string;
  reviewed_at: string | null;
};

type DeliveryRecord = {
  delivery_status: "processing" | "sent" | "failed";
  attempts: number;
  provider_message_id: string | null;
  updated_at: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function buildEmail(application: BusinessApplication) {
  const businessName = escapeHtml(application.business_name);
  const representativeName = escapeHtml(application.representative_name);
  const applicationCode = escapeHtml(application.application_code);

  const subject = `Your CargoTrackPH business account is approved — ${application.application_code}`;
  const textContent = [
    `Hello ${application.representative_name},`,
    "",
    `Great news! ${application.business_name} has been approved on CargoTrackPH.`,
    `Application code: ${application.application_code}`,
    "",
    "You can now sign in to CargoTrackPH using your registered account and access the Business Portal.",
    "",
    "If you did not submit this application, reply to this email immediately.",
    "",
    "CargoTrackPH Support",
  ].join("\n");

  const htmlContent = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f3f7fa;font-family:Arial,sans-serif;color:#123b5d">
    <div style="max-width:620px;margin:0 auto;padding:32px 16px">
      <div style="background:#123b5d;border-radius:18px 18px 0 0;padding:24px 28px;border-bottom:4px solid #f5b82e">
        <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#f5b82e;font-weight:700">CargoTrackPH</div>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:27px;line-height:1.25">Business account approved</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #dce5ea;border-top:0;border-radius:0 0 18px 18px;padding:28px">
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6">Hello ${representativeName},</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6">Great news! <strong>${businessName}</strong> has been approved on CargoTrackPH.</p>
        <div style="background:#eaf4f8;border-radius:12px;padding:16px 18px;margin:22px 0">
          <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#64748b;font-weight:700">Application code</div>
          <div style="margin-top:6px;font-size:18px;font-weight:700;color:#123b5d">${applicationCode}</div>
        </div>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6">You can now sign in to CargoTrackPH using your registered account and access the Business Portal.</p>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b">If you did not submit this application, reply to this email immediately.</p>
      </div>
      <p style="margin:18px 0 0;text-align:center;font-size:12px;color:#64748b">CargoTrackPH · Reliable Logistics Solutions</p>
    </div>
  </body>
</html>`;

  return { subject, textContent, htmlContent };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "CargoTrackPH";

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey ||
    !brevoApiKey ||
    !senderEmail
  ) {
    console.error("Missing required Edge Function environment variables.");
    return jsonResponse({ error: "Email service is not configured." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Invalid or expired administrator session." }, 401);
  }

  const { data: isAdmin, error: adminError } = await userClient.rpc("is_admin");
  if (adminError || !isAdmin) {
    return jsonResponse({ error: "Administrator access required." }, 403);
  }

  let payload: ApprovalRequest;
  try {
    payload = (await request.json()) as ApprovalRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON request body." }, 400);
  }

  if (!isUuid(payload.applicationId)) {
    return jsonResponse({ error: "A valid applicationId is required." }, 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: applicationData, error: applicationError } = await adminClient
    .from("business_applications")
    .select(
      "id, application_code, business_name, representative_name, email, status, reviewed_at",
    )
    .eq("id", payload.applicationId)
    .maybeSingle();

  if (applicationError) {
    console.error("Unable to load business application:", applicationError.message);
    return jsonResponse({ error: "Unable to load the business application." }, 500);
  }

  const application = applicationData as BusinessApplication | null;
  if (!application) {
    return jsonResponse({ error: "Business application not found." }, 404);
  }

  if (application.status !== "approved") {
    return jsonResponse(
      { error: "Approval email can only be sent for an approved application." },
      409,
    );
  }

  const recipientEmail = application.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return jsonResponse({ error: "The application email address is invalid." }, 422);
  }

  const { data: existingData, error: existingError } = await adminClient
    .from("business_approval_email_deliveries")
    .select("delivery_status, attempts, provider_message_id, updated_at")
    .eq("application_id", application.id)
    .maybeSingle();

  if (existingError) {
    console.error("Unable to read approval email log:", existingError.message);
    return jsonResponse({ error: "Approval email log is unavailable." }, 500);
  }

  const existing = existingData as DeliveryRecord | null;
  if (existing?.delivery_status === "sent") {
    return jsonResponse({
      status: "already_sent",
      messageId: existing.provider_message_id,
    });
  }

  const processingStartedAt = new Date().toISOString();
  let processingError: { code?: string; message: string } | null = null;

  if (!existing) {
    const { error } = await adminClient
      .from("business_approval_email_deliveries")
      .insert({
        application_id: application.id,
        recipient_email: recipientEmail,
        delivery_status: "processing",
        attempts: 1,
        provider_message_id: null,
        last_error: null,
        requested_by: user.id,
        updated_at: processingStartedAt,
      });
    processingError = error;
  } else {
    const processingAge = Date.now() - new Date(existing.updated_at).getTime();
    if (existing.delivery_status === "processing" && processingAge < 5 * 60_000) {
      return jsonResponse({ error: "The approval email is already being sent." }, 409);
    }

    const { data: claimedRows, error } = await adminClient
      .from("business_approval_email_deliveries")
      .update({
        recipient_email: recipientEmail,
        delivery_status: "processing",
        attempts: existing.attempts + 1,
        provider_message_id: null,
        last_error: null,
        requested_by: user.id,
        updated_at: processingStartedAt,
      })
      .eq("application_id", application.id)
      .eq("updated_at", existing.updated_at)
      .select("application_id");

    processingError = error;
    if (!error && (!claimedRows || claimedRows.length !== 1)) {
      return jsonResponse({ error: "The approval email is already being sent." }, 409);
    }
  }

  if (processingError) {
    if (processingError.code === "23505") {
      return jsonResponse({ error: "The approval email is already being sent." }, 409);
    }
    console.error("Unable to reserve approval email delivery:", processingError.message);
    return jsonResponse({ error: "Unable to prepare the approval email." }, 500);
  }

  const email = buildEmail(application);
  const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      replyTo: { email: senderEmail, name: `${senderName} Support` },
      to: [
        {
          email: recipientEmail,
          name: application.representative_name,
        },
      ],
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent,
      tags: ["business-approval"],
      headers: {
        "Idempotency-Key": `business-approval-${application.id}`,
      },
    }),
  });

  const brevoBody = (await brevoResponse.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
    code?: string;
  };

  if (!brevoResponse.ok || !brevoBody.messageId) {
    const providerError =
      brevoBody.message || brevoBody.code || `Brevo HTTP ${brevoResponse.status}`;
    console.error("Brevo approval email failed:", providerError);

    await adminClient
      .from("business_approval_email_deliveries")
      .update({
        delivery_status: "failed",
        last_error: providerError.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("application_id", application.id);

    return jsonResponse(
      { error: "The business was approved, but the approval email was not sent." },
      502,
    );
  }

  const sentAt = new Date().toISOString();
  const { error: sentError } = await adminClient
    .from("business_approval_email_deliveries")
    .update({
      delivery_status: "sent",
      provider_message_id: brevoBody.messageId,
      last_error: null,
      sent_at: sentAt,
      updated_at: sentAt,
    })
    .eq("application_id", application.id);

  if (sentError) {
    console.error("Email sent but delivery log update failed:", sentError.message);
  }

  return jsonResponse({ status: "sent", messageId: brevoBody.messageId });
});
