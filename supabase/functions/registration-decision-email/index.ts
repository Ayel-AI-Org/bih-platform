import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RegistrationDecisionPayload = {
  userId?: string;
  to: string;
  name: string;
  role: string; // "Volunteer" | "NGO" | "NGO Partner" | "Donor"
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  requestMoreInfo?: boolean;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("REGISTRATION_EMAIL_FROM") || "BIH <no-reply@bih.org>";

    // 1. Authenticate caller and verify admin/super_admin privileges
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing authentication token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: missing database credentials." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired authentication token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller role
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .maybeSingle();

    if (callerProfileError || !callerProfile) {
      return new Response(JSON.stringify({ error: "Forbidden: Unable to verify caller permissions." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCallerAdmin = callerProfile.role === "admin" || callerProfile.role === "super_admin";
    if (!isCallerAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Only administrators can update registration status." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validate payload
    const payload = (await req.json()) as RegistrationDecisionPayload;
    if (!payload?.to || !payload?.name || !payload?.role || !payload?.status) {
      return new Response(JSON.stringify({ error: "Invalid payload: 'to', 'name', 'role', and 'status' are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. If userId is provided, persist status and admin notes in database via service role
    if (payload.userId) {
      const normalizedRole = payload.role.toLowerCase();
      let tableName = "volunteer_profiles";
      if (normalizedRole.includes("ngo")) {
        tableName = "ngo_profiles";
      } else if (normalizedRole.includes("donor")) {
        tableName = "donor_profiles";
      }

      // Try updating with admin_notes
      const updateData: Record<string, unknown> = {
        approval_status: payload.status,
      };
      if (payload.adminNote !== undefined) {
        updateData.admin_notes = payload.adminNote;
      }

      const { error: dbError } = await supabaseAdmin
        .from(tableName)
        .update(updateData)
        .eq("user_id", payload.userId);

      if (dbError && dbError.message.toLowerCase().includes("admin_notes")) {
        // Fallback if admin_notes column is pending migration
        await supabaseAdmin
          .from(tableName)
          .update({ approval_status: payload.status })
          .eq("user_id", payload.userId);
      }
    }

    // 4. Construct professional, empathetic email
    const approved = payload.status === "approved";
    const subject = approved
      ? "Welcome to Bridge for Impact Hub — Registration Approved"
      : "Notification Regarding Your BIH Registration";

    const reasonSection = payload.adminNote
      ? `<div style="background-color: #f8fafc; border-left: 4px solid #C0392B; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #1e293b; font-size: 14px;">Reason:</p>
          <p style="margin: 4px 0 0; color: #334155; font-size: 14px; line-height: 1.5;">${payload.adminNote}</p>
        </div>`
      : "";

    const html = approved
      ? `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #6B8E3E; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Registration Approved</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          <p>Dear ${payload.name},</p>
          <p>We are pleased to inform you that your registration with Bridge for Impact Hub has been approved. You now have full clearance to access the platform.</p>
          ${payload.adminNote ? `<p><strong>Administrator Note:</strong> ${payload.adminNote}</p>` : ""}
          <p style="margin: 24px 0;">
            <a href="https://bridgeforimpacthub.org/login" style="background-color: #1E3A5F; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Sign In to Your Account</a>
          </p>
          <p>Thank you for joining our community and contributing to meaningful impact.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            Regards,<br/>
            <strong>Bridge for Impact Hub</strong>
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #C0392B; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Registration Decision</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          <p>Dear ${payload.name},</p>
          <p>Thank you for your interest in joining Bridge for Impact Hub as a ${payload.role.toLowerCase()}.</p>
          <p>After careful review of your application by our team, we regret to inform you that your registration could not be approved at this time.</p>
          ${reasonSection}
          <p>If you believe this action was taken in error or require further clarification, please contact us through our official communication channels at <a href="mailto:bridgeforimpacthub@gmail.com" style="color: #1E3A5F;">bridgeforimpacthub@gmail.com</a> or call <strong>+233 (0) 53 011 0924</strong>.</p>
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
        emailError = err instanceof Error ? err.message : "Network error calling Resend API";
        console.error(`Failed to send decision email: ${emailError}`);
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
          ? "Registration status updated and notification email sent successfully."
          : `Registration status updated. Email delivery notice: ${emailError}`,
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
