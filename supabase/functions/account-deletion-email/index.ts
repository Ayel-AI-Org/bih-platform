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

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RESEND_API_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Fetch user profile details before deletion
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return new Response(JSON.stringify({ error: `Failed to fetch profile: ${profileError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile) {
      // Profile already deleted or doesn't exist, proceed with deleting auth user directly
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        return new Response(JSON.stringify({ error: `Failed to delete auth user: ${deleteError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, message: "Auth user deleted, no profile found." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name: name, role } = profile;

    // 2. Clean up storage files in bih-avatars
    try {
      const { data: avatarFiles } = await supabaseAdmin.storage.from("bih-avatars").list(userId);
      if (avatarFiles && avatarFiles.length > 0) {
        const paths = avatarFiles.map((f) => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from("bih-avatars").remove(paths);
      }
    } catch (err) {
      console.error("Failed to clean up avatars storage:", err);
    }

    // 3. Clean up storage files in bih-media
    try {
      const portfolioPath = `portfolio/${userId}`;
      const { data: mediaFiles } = await supabaseAdmin.storage.from("bih-media").list(portfolioPath);
      if (mediaFiles && mediaFiles.length > 0) {
        const paths = mediaFiles.map((f) => `portfolio/${userId}/${f.name}`);
        await supabaseAdmin.storage.from("bih-media").remove(paths);
      }
    } catch (err) {
      console.error("Failed to clean up portfolio media storage:", err);
    }

    // 4. Send the farewell deletion email
    if (email) {
      const subject = "Bridge for Impact Hub — Account Deleted";
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #C0392B; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Account Removed</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 20px;" />
          <p>Hello ${name},</p>
          <p>This email confirms that your Bridge for Impact Hub account (associated with the ${role.toLowerCase()} role) has been successfully deleted.</p>
          <p>All of your personal profile data, including any logs, portfolio entries, and uploaded assets, has been completely removed from our systems in accordance with our data deletion policy.</p>
          <p>Thank you for the time you spent collaborating with us on the platform.</p>
          <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
            Warm regards,<br/>
            <strong>Bridge for Impact Hub Support Team</strong>
          </p>
        </div>
      `;

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
          const errText = await resendResponse.text();
          console.error(`Resend API returned error: ${errText}`);
        }
      } catch (emailErr) {
        console.error(`Failed to send email via Resend: ${emailErr}`);
      }
    }

    // 5. Delete user from auth (cascades to public tables)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: `Failed to delete user from auth: ${deleteError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "User deleted and email dispatched." }), {
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
