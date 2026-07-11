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
    const fromEmail = Deno.env.get("DONOR_SUMMARY_EMAIL_FROM") || Deno.env.get("REGISTRATION_EMAIL_FROM") || "BIH Impact <no-reply@bridgeforimpacthub.org>";

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing database or Resend credentials in environment." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Calculate past quarter range (3 months ago)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // 2. Fetch unique donors with successful donations from the past quarter
    const { data: donations, error: donErr } = await supabaseAdmin
      .from("donations")
      .select("email, full_name")
      .eq("status", "success")
      .gte("created_at", threeMonthsAgo.toISOString());

    if (donErr) {
      throw new Error(`Failed to query past quarter donations: ${donErr.message}`);
    }

    // De-duplicate donors by email (case-insensitive)
    const uniqueDonors: { email: string; fullName: string }[] = [];
    const seenEmails = new Set<string>();

    for (const row of donations || []) {
      const emailLower = row.email.toLowerCase();
      if (!seenEmails.has(emailLower)) {
        seenEmails.add(emailLower);
        uniqueDonors.push({
          email: row.email,
          fullName: row.full_name || "Generous Donor",
        });
      }
    }

    if (uniqueDonors.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No donors found for this quarter." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch global impact metrics
    // A. Total funds raised (all time or this quarter? The requirement says: "total global impact metrics (e.g., total funds raised, active projects)")
    // Let's compute all-time total funds raised for global metrics
    const { data: totalRaisedData, error: sumErr } = await supabaseAdmin
      .from("donations")
      .select("amount")
      .eq("status", "success");

    if (sumErr) {
      throw new Error(`Failed to calculate total funds: ${sumErr.message}`);
    }

    const totalFundsRaised = (totalRaisedData || []).reduce((sum, d) => sum + Number(d.amount), 0);

    // B. Total active (ongoing) projects count
    const { count: activeProjects, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "ongoing");

    if (projErr) {
      throw new Error(`Failed to calculate active projects: ${projErr.message}`);
    }

    // 4. Send email summaries
    let sentCount = 0;
    for (const donor of uniqueDonors) {
      const subject = "Bridge for Impact Hub — Quarterly Impact Summary";
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px; margin-top: 0;">Bridge for Impact Hub</h2>
            <span style="font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Quarterly Impact Summary</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />

          <p>Dear ${donor.fullName},</p>
          <p>This quarter, your contributions helped BIH expand our regional project footprints. We are incredibly grateful for your partnership and want to share the collective impact we've achieved together.</p>

          <h3 style="color: #1E3A5F; font-family: serif; margin-top: 24px; margin-bottom: 12px;">Our Global Impact This Quarter</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="width: 50%; padding-right: 8px;">
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; text-align: center;">
                  <span style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 4px;">Total Funds Raised</span>
                  <strong style="color: #16a34a; font-size: 18px; display: block;">GHS ${totalFundsRaised.toFixed(2)}</strong>
                </div>
              </td>
              <td style="width: 50%; padding-left: 8px;">
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; text-align: center;">
                  <span style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 4px;">Active Projects</span>
                  <strong style="color: #1E3A5F; font-size: 18px; display: block;">${activeProjects || 0} Ongoing</strong>
                </div>
              </td>
            </tr>
          </table>

          <p>Your support plays a vital role in funding these active initiatives and fostering community-led development. Thank you for standing with us to build a better future.</p>

          <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
            With sincere gratitude,<br/>
            <strong>Bridge for Impact Hub Team</strong>
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
            to: [donor.email],
            subject,
            html,
          }),
        });

        if (resendResponse.ok) {
          sentCount++;
        } else {
          const errText = await resendResponse.text();
          console.error(`Failed to send summary to ${donor.email}: ${errText}`);
        }
      } catch (err) {
        console.error(`Failed to send email to ${donor.email}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, count: sentCount, message: `Dispatched summaries to ${sentCount} donors.` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Donor Impact Summary Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
