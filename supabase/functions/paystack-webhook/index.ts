import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      console.error("Missing PAYSTACK_SECRET_KEY environment variable.");
      return new Response(JSON.stringify({ error: "Webhook configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the signature header from Paystack
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      console.error("Missing x-paystack-signature header.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Read raw body as text for signature verification
    const rawBody = await req.text();

    // Verify HMAC-SHA512 signature
    const encoder = new TextEncoder();
    const keyBuf = encoder.encode(paystackSecret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuf,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const bodyBuf = encoder.encode(rawBody);
    const signedBuf = await crypto.subtle.sign("HMAC", key, bodyBuf);
    const signatureArray = Array.from(new Uint8Array(signedBuf));
    const calculatedSignature = signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (calculatedSignature !== signature) {
      console.error("Invalid signature comparison.", { signature, calculatedSignature });
      return new Response(JSON.stringify({ error: "Unauthorized signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`Processing Paystack event: ${event}`);

    if (event === "charge.success") {
      const data = payload.data;
      const reference = data.reference;
      const rawAmount = data.amount; // in subunits (kobo/pesewas)
      const amount = rawAmount / 100;
      const currency = data.currency || "GHS";
      const email = data.customer?.email;
      
      const metadata = data.metadata || {};
      const fullName = metadata.full_name || data.customer?.first_name || "Generous Donor";
      const purpose = metadata.purpose || "General Support";
      const message = metadata.message || null;
      const donorId = metadata.donor_id || null;
      const rawChannel = data.channel || "card";
      
      // Map channels to our payment_method enum: 'mobile_money' | 'card' | 'bank_transfer'
      let paymentMethod: "mobile_money" | "card" | "bank_transfer" = "card";
      if (rawChannel === "mobile_money") {
        paymentMethod = "mobile_money";
      } else if (rawChannel === "bank_transfer") {
        paymentMethod = "bank_transfer";
      }

      // Initialize Supabase Admin client
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing database credentials in server environment.");
      }
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Upsert donation record to handle potential duplicate webhook deliveries safely
      console.log(`Inserting/Updating donation record in DB for reference: ${reference}`);
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("donations")
        .select("id, status")
        .eq("paystack_reference", reference)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      let dbError;
      if (existing) {
        if (existing.status === "success") {
          console.log(`Donation ${reference} already recorded as success. Skipping.`);
          return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // Update existing record
        const { error } = await supabaseAdmin
          .from("donations")
          .update({
            status: "success",
            amount,
            currency,
            payment_method: paymentMethod,
            full_name: fullName,
            email,
            purpose,
            message,
            donor_id: donorId,
          })
          .eq("id", existing.id);
        dbError = error;
      } else {
        // Insert new record
        const { error } = await supabaseAdmin
          .from("donations")
          .insert({
            paystack_reference: reference,
            status: "success",
            amount,
            currency,
            payment_method: paymentMethod,
            full_name: fullName,
            email,
            purpose,
            message,
            donor_id: donorId,
            confirmation_email_status: "pending",
          });
        dbError = error;
      }

      if (dbError) {
        throw dbError;
      }

      // Trigger Resend confirmation email
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("DONATION_EMAIL_FROM") || Deno.env.get("SUGGESTED_EMAIL_FROM") || "BIH <no-reply@bridgeforimpacthub.org>";

      if (resendApiKey && email) {
        console.log(`Sending receipt confirmation email to ${email}`);
        const subject = "Thank you for your donation — Bridge for Impact Hub";
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1E3A5F; font-family: serif; margin-bottom: 4px;">Bridge for Impact Hub</h2>
              <span style="font-size: 12px; color: #D4A017; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">Donation Receipt</span>
            </div>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 20px;" />
            <p>Hi ${fullName},</p>
            <p>Thank you for your generous support! We have received your donation payment through Paystack.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Amount:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #1e293b;">${currency} ${amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Purpose:</td>
                  <td style="padding: 4px 0; text-align: right; color: #1e293b;">${purpose}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Transaction Reference:</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace; color: #1e293b;">${reference}</td>
                </tr>
              </table>
            </div>

            <p>Your contribution helps fund active projects and coordinate key local blueprints. We value your commitment to driving community development alongside us.</p>
            <p>If you have any questions or require additional documentation, please reply directly to this email.</p>
            <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
              Warm regards,<br/>
              <strong>Bridge for Impact Hub Finance Team</strong>
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

          if (resendResponse.ok) {
            console.log(`Confirmation email sent successfully.`);
            await supabaseAdmin
              .from("donations")
              .update({ confirmation_email_status: "sent" })
              .eq("paystack_reference", reference);
          } else {
            const errText = await resendResponse.text();
            console.error(`Resend API returned error: ${errText}`);
          }
        } catch (emailErr) {
          console.error(`Failed to send email via Resend: ${emailErr}`);
        }
      } else {
        console.warn("Skipping email receipt. Resend API key or customer email missing.");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Paystack Webhook Handler Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
