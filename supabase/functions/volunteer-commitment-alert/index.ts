import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CommitmentPayload = {
  volunteerId: string;
  projectId: string;
  hours: number;
  activityDescription: string;
  logDate: string;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("REGISTRATION_EMAIL_FROM") || "BIH <no-reply@bridgeforimpacthub.org>";

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing database or Resend credentials in environment." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = (await req.json()) as CommitmentPayload;
    const { volunteerId, projectId, hours, activityDescription, logDate } = payload;

    if (!volunteerId || !projectId || !hours || !activityDescription || !logDate) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing required fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Fetch Volunteer Profile
    const { data: volunteerProfile, error: volErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", volunteerId)
      .single();

    if (volErr || !volunteerProfile) {
      throw new Error(`Failed to resolve volunteer profile: ${volErr?.message || "Not found"}`);
    }

    // 2. Fetch Project Details
    const { data: project, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("title, timeline, location, created_by")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      throw new Error(`Failed to resolve project details: ${projErr?.message || "Not found"}`);
    }

    // 3. Fetch Coordinator Details (Project creator profile & NGO phone if exists)
    let coordinatorProfile = null;
    let coordinatorPhone = "";
    if (project.created_by) {
      const { data: coord } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", project.created_by)
        .single();
      coordinatorProfile = coord;

      const { data: ngo } = await supabaseAdmin
        .from("ngo_profiles")
        .select("phone")
        .eq("user_id", project.created_by)
        .maybeSingle();
      if (ngo?.phone) {
        coordinatorPhone = ngo.phone;
      }
    }

    // 4. Calculate Cumulative Hours and Check Milestones
    const { data: totalHoursData, error: hoursErr } = await supabaseAdmin
      .from("commitment_logs")
      .select("hours")
      .eq("volunteer_id", volunteerId);

    if (hoursErr) {
      console.error("Failed to query cumulative hours:", hoursErr);
    }

    const totalHours = (totalHoursData || []).reduce((sum, log) => sum + Number(log.hours), 0);
    const previousHours = totalHours - hours;

    const milestones = [10, 50, 100];
    let crossedMilestone = null;
    for (const milestone of milestones) {
      if (previousHours < milestone && totalHours >= milestone) {
        crossedMilestone = milestone;
      }
    }

    let milestoneBanner = "";
    if (crossedMilestone) {
      milestoneBanner = `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
          <h3 style="color: #15803d; margin: 0 0 8px 0; font-size: 18px;">Congratulations! 🎉</h3>
          <p style="color: #166534; margin: 0; font-size: 14px;">
            You've reached a new service milestone of <strong>${crossedMilestone} cumulative hours</strong> logged on Bridge for Impact Hub! Thank you for your amazing dedication.
          </p>
        </div>
      `;
    }

    // 5. Construct email HTML template
    const subject = "Volunteer Service Logged successfully — Bridge for Impact Hub";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px; margin-top: 0;">Bridge for Impact Hub</h2>
          <span style="font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Volunteer Hours Logged</span>
        </div>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />
        
        ${milestoneBanner}

        <p>Hello ${volunteerProfile.full_name},</p>
        <p>Thank you for logging your service hours! We have received your commitment log, and the host organization has been notified to verify it.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 40%;">Project Name:</td>
              <td style="padding: 6px 0; text-align: right; color: #1e293b;">${project.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Hours Logged:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1E3A5F;">${hours} hours</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Log Date:</td>
              <td style="padding: 6px 0; text-align: right; color: #1e293b;">${logDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Activity:</td>
              <td style="padding: 6px 0; text-align: right; color: #1e293b;">${activityDescription}</td>
            </tr>
          </table>
        </div>

        <h4 style="color: #1E3A5F; margin-top: 24px; margin-bottom: 8px;">Project Details & Coordinator Info</h4>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; font-size: 14px;">
          <p style="margin: 0 0 6px 0;"><strong>Location:</strong> ${project.location}</p>
          <p style="margin: 0 0 12px 0;"><strong>Timeline:</strong> ${project.timeline || "N/A"}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 12px;" />
          <p style="margin: 0 0 6px 0;"><strong>Coordinator Name:</strong> ${coordinatorProfile?.full_name || "N/A"}</p>
          <p style="margin: 0 0 6px 0;"><strong>Coordinator Email:</strong> <a href="mailto:${coordinatorProfile?.email || ''}">${coordinatorProfile?.email || "N/A"}</a></p>
          ${coordinatorPhone ? `<p style="margin: 0;"><strong>Coordinator Phone:</strong> ${coordinatorPhone}</p>` : ""}
        </div>

        <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
          Warm regards,<br/>
          <strong>Bridge for Impact Hub Support Team</strong>
        </p>
      </div>
    `;

    // 6. Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [volunteerProfile.email],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error(`Resend API returned error: ${resendError}`);
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
    console.error("Volunteer Commitment Alert Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
