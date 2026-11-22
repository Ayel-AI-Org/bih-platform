import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DecisionPayload = {
  to: string;
  submittedBy: string;
  title: string;
  status: "approved" | "rejected";
  adminNotes?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("SUGGESTION_EMAIL_FROM") || Deno.env.get("SUGGESTED_EMAIL_FROM") || "BIH <no-reply@bih.org>";

    const payload = (await req.json()) as DecisionPayload;
    if (!payload?.to || !payload?.title || !payload?.status || !payload?.submittedBy) {
      return new Response(JSON.stringify({ error: "Invalid payload: 'to', 'title', 'status', and 'submittedBy' are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const approved = payload.status === "approved";
    const subject = approved
      ? `Project Proposal Approved: ${payload.title}`
      : `Notification Regarding Your Project Proposal: ${payload.title}`;

    const reasonSection = payload.adminNotes
      ? `<div style="background-color: #f8fafc; border-left: 4px solid #C0392B; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #1e293b; font-size: 14px;">Review Feedback / Reason:</p>
          <p style="margin: 4px 0 0; color: #334155; font-size: 14px; line-height: 1.5;">${payload.adminNotes}</p>
        </div>`
      : "";

    const html = approved
      ? `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #6B8E3E; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Proposal Approved</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          <p>Dear ${payload.submittedBy},</p>
          <p>We are delighted to inform you that your project proposal, <strong>${payload.title}</strong>, has been approved by the Bridge for Impact Hub project review committee.</p>
          ${payload.adminNotes ? `<p><strong>Administrator Notes:</strong> ${payload.adminNotes}</p>` : ""}
          <p>Our operational coordination team will follow up with you regarding scheduling, resource alignment, and community onboarding.</p>
          <p>Thank you for collaborating with Bridge for Impact Hub to create positive, measurable community transformation.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            Warm regards,<br/>
            <strong>Bridge for Impact Hub Project Committee</strong>
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #C0392B; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Proposal Decision</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          <p>Dear ${payload.submittedBy},</p>
          <p>Thank you for submitting your project proposal, <strong>${payload.title}</strong>, to Bridge for Impact Hub.</p>
          <p>After thorough review against our current operational focus and resource allocation guidelines, we regret to inform you that this proposal cannot be accepted for active platform mobilization at this time.</p>
          ${reasonSection}
          <p>If you believe this proposal requires further clarification or if you would like to explore alternative ways to engage, please do not hesitate to contact us at <a href="mailto:bridgeforimpacthub@gmail.com" style="color: #1E3A5F;">bridgeforimpacthub@gmail.com</a> or call <strong>+233 (0) 57 880 9478</strong>.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            Regards,<br/>
            <strong>Bridge for Impact Hub</strong>
          </p>
        </div>
      `;

    let emailSent = false;
    let emailError: string | null = null;

    if (resendApiKey) {
      try {
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
          emailError = await resendResponse.text();
          console.error(`Resend API returned error: ${emailError}`);
        } else {
          emailSent = true;
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : "Network error during proposal decision email dispatch";
        console.error(`Failed to send email: ${emailError}`);
      }
    } else {
      console.warn("RESEND_API_KEY is not configured. Email dispatch skipped in local/test environment.");
      emailError = "Email service not configured (missing RESEND_API_KEY)";
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        emailError: emailSent ? undefined : emailError,
        message: emailSent
          ? "Decision email sent successfully."
          : `Decision processed. Email notice: ${emailError}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
