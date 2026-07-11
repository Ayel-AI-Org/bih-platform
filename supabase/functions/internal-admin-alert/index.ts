import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("ADMIN_ALERT_EMAIL_FROM") || Deno.env.get("REGISTRATION_EMAIL_FROM") || "BIH Alerts <no-reply@bridgeforimpacthub.org>";
    const toEmail = Deno.env.get("ADMIN_ALERT_EMAIL") || "admin@bridgeforimpacthub.org";

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY in environment." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { type } = payload;

    if (!type) {
      return new Response(JSON.stringify({ error: "Invalid payload: missing type." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "BIH Internal Alert";
    let html = "";

    if (type === "high_tier_donation") {
      const { email, fullName, amount, currency, reference, purpose } = payload;
      subject = `⚠️ High-Tier Donation Received: ${currency} ${amount}`;
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px; margin-top: 0;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #C0392B; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">System Alert: High-Tier Donation</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />
          
          <p>Hello Admins,</p>
          <p>This is an automated system alert. A high-tier donation has been successfully processed through the Paystack gateway:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 40%;">Donor Name:</td>
                <td style="padding: 6px 0; text-align: right; color: #1e293b;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Donor Email:</td>
                <td style="padding: 6px 0; text-align: right; color: #1e293b;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Amount:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #16a34a;">${currency} ${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Purpose:</td>
                <td style="padding: 6px 0; text-align: right; color: #1e293b;">${purpose}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Reference:</td>
                <td style="padding: 6px 0; text-align: right; font-family: monospace; color: #1e293b;">${reference}</td>
              </tr>
            </table>
          </div>

          <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
            System Alert Service,<br/>
            <strong>Bridge for Impact Hub</strong>
          </p>
        </div>
      `;
    } else if (type === "project_proposal") {
      const { submittedBy, email, title, description, location, timeline } = payload;
      subject = `📢 New Project Proposal Submitted: ${title}`;
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px; margin-top: 0;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #1E3A5F; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">System Alert: Project Proposal</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />
          
          <p>Hello Admins,</p>
          <p>A new project proposal has been submitted on the public portal and is ready for admin review:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 40%;">Submitted By:</td>
                <td style="padding: 6px 0; text-align: right; color: #1e293b;">${submittedBy}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Contact Email:</td>
                <td style="padding: 6px 0; text-align: right; color: #1e293b;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Project Title:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1E3A5F;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Location:</td>
                <td style="padding: 6px 0; text-align: right; color: #1e293b;">${location}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Timeline:</td>
                <td style="padding: 6px 0; text-align: right; color: #1e293b;">${timeline}</td>
              </tr>
            </table>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; color: #64748b; font-weight: bold;">Description:</p>
              <p style="margin: 0; color: #334155; font-size: 13px;">${description}</p>
            </div>
          </div>

          <p>Please log into the Admin Dashboard at <a href="https://bridgeforimpacthub.org/admin/suggestions">bridgeforimpacthub.org/admin/suggestions</a> to review this request.</p>

          <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
            System Alert Service,<br/>
            <strong>Bridge for Impact Hub</strong>
          </p>
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ error: "Unsupported alert type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error(`Resend API returned error for internal alert: ${resendError}`);
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
    console.error("Internal Admin Alert Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
