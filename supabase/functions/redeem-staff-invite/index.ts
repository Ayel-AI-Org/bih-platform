import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RedeemPayload = {
  token: string;
  fullName: string;
  email: string;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as RedeemPayload;

    if (!payload?.token || !payload?.fullName || !payload?.email) {
      return new Response(JSON.stringify({ error: "Token, fullName, and email are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify invitation token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("staff_invites")
      .select("id, email, role, redeemed_at, expires_at")
      .eq("token", payload.token)
      .maybeSingle();

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invite) {
      return new Response(JSON.stringify({ error: "Invalid invitation token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.redeemed_at) {
      return new Response(JSON.stringify({ error: "This invitation has already been redeemed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This invitation token has expired." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create the admin user passwordless
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        full_name: payload.fullName,
      },
    });

    if (createUserError || !createdUser?.user?.id) {
      return new Response(
        JSON.stringify({ error: createUserError?.message ?? "Could not create admin account." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = createdUser.user.id;

    // 3. Insert admin profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      role: "admin",
      full_name: payload.fullName,
      email: payload.email,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Mark token as redeemed
    const { error: redeemUpdateError } = await supabaseAdmin
      .from("staff_invites")
      .update({ redeemed_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (redeemUpdateError) {
      // Clean up user if we couldn't complete redemption
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to mark token as redeemed." }), {
        status: 400,
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
