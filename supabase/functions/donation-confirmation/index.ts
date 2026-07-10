import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DonationPayload = {
  email: string;
  fullName: string;
  currency: string;
  amount: number;
  purpose: string;
  reference: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("DONATION_EMAIL_FROM") || Deno.env.get("SUGGESTED_EMAIL_FROM") || "BIH <no-reply@bih.org>";

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as DonationPayload;
    if (!payload?.email || !payload?.fullName || !payload?.amount || !payload?.currency || !payload?.reference) {
      return new Response(JSON.stringify({ error: "Invalid payload details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = "Thank you for your donation — Bridge for Impact Hub";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h3>Donation Receipt & Acknowledgment</h3>
        <p>Hi ${payload.fullName},</p>
        <p>We've received your donation of <strong>${payload.currency} ${payload.amount}</strong>.</p>
        <p>Your generosity directly supports <strong>${payload.purpose || "General Support"}</strong>.</p>
        <p>Reference ID: <code>${payload.reference}</code></p>
        <p>Thank you for contributing to Bridge for Impact Hub and making a positive difference in our community.</p>
        <p>Warm regards,<br/>Bridge for Impact Hub Finance Team</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.email],
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
