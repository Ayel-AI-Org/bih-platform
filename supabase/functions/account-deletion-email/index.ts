import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("DELETION_EMAIL_FROM") || Deno.env.get("REGISTRATION_EMAIL_FROM") || "BIH <no-reply@bih.org>";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: missing database credentials." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Authenticate the caller using the Authorization bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing authentication token." }), {
        status: 401,
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

    // 2. Parse request payload to determine target user and deletion reason
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      // Body may be empty for self-deletion calls
    }

    const targetUserId = (typeof body?.userId === "string" ? body.userId : null) || callerUser.id;
    const deletionReason = typeof body?.reason === "string" ? body.reason.trim() : "";

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetUserId)) {
      return new Response(JSON.stringify({ error: "Invalid target user ID format." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Authorization check: If deleting someone else, caller must be an admin and reason is required
    const isDeletingSelf = callerUser.id === targetUserId;
    if (!isDeletingSelf) {
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
        return new Response(JSON.stringify({ error: "Forbidden: You are not authorized to delete other user accounts." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Administrator must provide a non-empty deletion reason
      if (!deletionReason) {
        return new Response(JSON.stringify({ error: "Validation error: An administrative deletion reason must be provided." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if target user is an admin; do not allow deleting the last remaining admin
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetProfile && (targetProfile.role === "admin" || targetProfile.role === "super_admin")) {
        const { count } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("role", ["admin", "super_admin"]);

        if (count !== null && count <= 1) {
          return new Response(JSON.stringify({ error: "Operation denied: Cannot delete the last remaining administrator." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // 4. Safely preserve target user profile details BEFORE deletion
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", targetUserId)
      .maybeSingle();

    const email = profile?.email;
    const name = profile?.full_name || "Community Member";

    // 5. Clean up storage files in bih-avatars
    try {
      const { data: avatarFiles } = await supabaseAdmin.storage.from("bih-avatars").list(targetUserId);
      if (avatarFiles && avatarFiles.length > 0) {
        const paths = avatarFiles.map((f) => `${targetUserId}/${f.name}`);
        await supabaseAdmin.storage.from("bih-avatars").remove(paths);
      }
    } catch (err) {
      console.error("Failed to clean up avatars storage:", err);
    }

    // 6. Clean up storage files in bih-media
    try {
      const portfolioPath = `portfolio/${targetUserId}`;
      const { data: mediaFiles } = await supabaseAdmin.storage.from("bih-media").list(portfolioPath);
      if (mediaFiles && mediaFiles.length > 0) {
        const paths = mediaFiles.map((f) => `portfolio/${targetUserId}/${f.name}`);
        await supabaseAdmin.storage.from("bih-media").remove(paths);
      }
    } catch (err) {
      console.error("Failed to clean up portfolio media storage:", err);
    }

    // 7. Dispatch formal notification email to affected user before deleting account record
    let emailSent = false;
    let emailError: string | null = null;

    if (email) {
      const subject = "Notification Regarding Your BIH Account";
      const reasonHtml = deletionReason
        ? `<div style="background-color: #f8fafc; border-left: 4px solid #C0392B; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #1e293b; font-size: 14px;">Reason:</p>
            <p style="margin: 4px 0 0; color: #334155; font-size: 14px; line-height: 1.5;">${deletionReason}</p>
          </div>`
        : "";

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #C0392B; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Account Deleted</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          <p>Dear ${name},</p>
          <p>We are writing to inform you that your Bridge for Impact Hub account has been deleted by an administrator.</p>
          ${reasonHtml}
          <p>If you believe this action was taken in error or require further clarification, please contact us through our official communication channels at <a href="mailto:bridgeforimpacthub@gmail.com" style="color: #1E3A5F;">bridgeforimpacthub@gmail.com</a> or call <strong>+233 (0) 57 880 9478</strong>.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            Regards,<br/>
            <strong>Bridge for Impact Hub</strong>
          </p>
        </div>
      `;

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
              to: [email],
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
        } catch (emailErr) {
          emailError = emailErr instanceof Error ? emailErr.message : "Network error during email delivery";
          console.error(`Failed to send email via Resend: ${emailError}`);
        }
      } else {
        console.warn("RESEND_API_KEY is missing. Email dispatch skipped in local/test environment.");
        emailError = "Email service not configured (missing RESEND_API_KEY)";
      }
    }

    // 8. Delete user from auth (cascades to public tables)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: `Failed to delete user account: ${deleteError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        emailError: emailSent ? undefined : emailError,
        message: emailSent
          ? "User account deleted and notification email successfully sent."
          : `User account deleted. Note on notification email: ${emailError || "Email not sent"}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
