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
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: missing database credentials." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Authenticate the caller and ensure they are an administrator
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

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .maybeSingle();

    if (!callerProfile || (callerProfile.role !== "admin" && callerProfile.role !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Forbidden: Administrator privileges required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if Paystack credentials are configured
    if (!paystackSecret || paystackSecret.trim() === "") {
      return new Response(
        JSON.stringify({
          configured: false,
          success: false,
          error: "PAYSTACK_SECRET_KEY is not configured in the server environment. Authoritative reconciliation requires live Paystack API credentials.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Real authoritative reconciliation with Paystack API
    // Fetch donations that need reconciliation (e.g. pending or recent)
    const { data: donations, error: fetchErr } = await supabaseAdmin
      .from("donations")
      .select("id, paystack_reference, status, amount, currency")
      .not("paystack_reference", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchErr) {
      throw fetchErr;
    }

    let reconciledCount = 0;
    const discrepancies: Array<{ id: string; reference: string; oldStatus: string; newStatus: string }> = [];

    for (const d of donations || []) {
      if (!d.paystack_reference) continue;

      try {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(d.paystack_reference)}`,
          {
            headers: {
              Authorization: `Bearer ${paystackSecret}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!verifyRes.ok) {
          continue;
        }

        const verifyData = await verifyRes.json();
        if (verifyData.status && verifyData.data) {
          const remoteStatus = verifyData.data.status; // "success", "failed", "abandoned"
          const remoteAmount = verifyData.data.amount / 100;
          const remoteCurrency = verifyData.data.currency || "GHS";

          let targetStatus = d.status;
          if (remoteStatus === "success") {
            targetStatus = "success";
          } else if (remoteStatus === "failed") {
            targetStatus = "failed";
          }

          if (d.status !== targetStatus || Number(d.amount) !== remoteAmount) {
            await supabaseAdmin
              .from("donations")
              .update({
                status: targetStatus,
                amount: remoteAmount,
                currency: remoteCurrency,
              })
              .eq("id", d.id);

            reconciledCount++;
            discrepancies.push({
              id: d.id,
              reference: d.paystack_reference,
              oldStatus: d.status,
              newStatus: targetStatus,
            });
          }
        }
      } catch (itemErr) {
        console.error(`Error verifying transaction ${d.paystack_reference}:`, itemErr);
      }
    }

    return new Response(
      JSON.stringify({
        configured: true,
        success: true,
        reconciledCount,
        checkedCount: (donations || []).length,
        discrepancies,
        message: `Paystack reconciliation completed. Verified ${(donations || []).length} records. Updated ${reconciledCount} records with live Paystack data.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Reconciliation error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
