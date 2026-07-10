import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RegistrationDecisionPayload = {
  to: string;
  name: string;
  role: "Volunteer" | "NGO" | "Donor";
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  requestMoreInfo?: boolean;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("REGISTRATION_EMAIL_FROM") || "BIH <no-reply@bih.org>";

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as RegistrationDecisionPayload;
    if (!payload?.to || !payload?.name || !payload?.role || !payload?.status) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const approved = payload.status === "approved";
    const statusLabel = approved ? "approved" : payload.status;
    const subject = approved
      ? "BIH Registration Approved"
      : "BIH Registration Status Update";

    const noteSection = payload.adminNote
      ? `<p><strong>Admin note:</strong> ${payload.adminNote}</p>`
      : "";

    const infoSection = payload.requestMoreInfo
      ? `<p>Please provide additional supporting details so our team can complete review.</p>`
      : "";

    const html = approved
      ? `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Welcome to Bridge for Impact Hub</h2>
          <p>Hello ${payload.name},</p>
          <p>Your BIH account has been approved. Sign in at <a href="https://bridgeforimpacthub.org/login">bridgeforimpacthub.org/login</a>.</p>
          ${noteSection}
          <p>You are now officially part of the BIH platform community.</p>
          <p>Thank you for joining us.</p>
        </div>`
      : `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Registration Status Update</h2>
          <p>Hello ${payload.name},</p>
          <p>Your ${payload.role.toLowerCase()} registration status is currently <strong>${statusLabel}</strong>.</p>
          ${noteSection}
          ${infoSection}
          <p>Thank you for your interest in Bridge for Impact Hub.</p>
        </div>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      return new Response(JSON.stringify({ error: resendError }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
