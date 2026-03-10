import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RegistrationPayload =
  | {
    role: "volunteer";
    fullName: string;
    email: string;
    password: string;
    phone: string;
    location: string;
    preferredContactChannels: string[];
    nationality: string;
    cityRegion: string;
    availabilityBlocks: string[];
    startDate: string;
    commitmentDuration: string;
    canTravel: boolean;
    maxTravelDistanceKm?: number;
    primarySkillCategories: string[];
    yearsOfExperience: string;
    languagesSpoken: string;
    pastExperience: string;
    targetCommunities: string;
    dataPrivacyConsent: boolean;
    skills: string;
    availability: string;
  }
  | {
    role: "ngo";
    organizationName: string;
    contactPerson: string;
    email: string;
    password: string;
    phone: string;
    preferredContactChannels: string[];
    alternateContact: string;
    cityRegion: string;
    yearEstablished: string;
    legalStatus: string;
    registrationAuthority: string;
    missionStatement: string;
    programsRunning: string;
    primaryBeneficiaries: string;
    geographicCoverage: string;
    teamSize: string;
    pastExperience: string;
    targetCommunities: string;
    focusArea: string;
    registrationNumber: string;
  }
  | {
    role: "donor";
    fullName: string;
    email: string;
    password: string;
    phone: string;
    donorType: "individual" | "organization";
    interests: string;
  };

function isApprovalStatusMissingColumnError(error: { message?: string } | null) {
  const message = (error?.message ?? "").toLowerCase();
  return message.includes("approval_status")
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
}

function encodeVolunteerSkills(payload: Extract<RegistrationPayload, { role: "volunteer" }>) {
  return JSON.stringify({
    skillsText: payload.skills,
    primarySkillCategories: payload.primarySkillCategories,
    yearsOfExperience: payload.yearsOfExperience,
    languagesSpoken: payload.languagesSpoken,
    pastExperience: payload.pastExperience,
    targetCommunities: payload.targetCommunities,
    preferredContactChannels: payload.preferredContactChannels,
    nationality: payload.nationality,
    cityRegion: payload.cityRegion,
    dataPrivacyConsent: payload.dataPrivacyConsent,
  });
}

function encodeVolunteerAvailability(payload: Extract<RegistrationPayload, { role: "volunteer" }>) {
  return JSON.stringify({
    availabilityText: payload.availability,
    availabilityBlocks: payload.availabilityBlocks,
    startDate: payload.startDate,
    commitmentDuration: payload.commitmentDuration,
    canTravel: payload.canTravel,
    maxTravelDistanceKm: payload.maxTravelDistanceKm ?? null,
  });
}

function encodeNgoFocusArea(payload: Extract<RegistrationPayload, { role: "ngo" }>) {
  return JSON.stringify({
    focusAreaText: payload.focusArea,
    preferredContactChannels: payload.preferredContactChannels,
    alternateContact: payload.alternateContact,
    cityRegion: payload.cityRegion,
    yearEstablished: payload.yearEstablished,
    legalStatus: payload.legalStatus,
    registrationAuthority: payload.registrationAuthority,
    missionStatement: payload.missionStatement,
    programsRunning: payload.programsRunning,
    primaryBeneficiaries: payload.primaryBeneficiaries,
    geographicCoverage: payload.geographicCoverage,
    teamSize: payload.teamSize,
    pastExperience: payload.pastExperience,
    targetCommunities: payload.targetCommunities,
  });
}

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

    const payload = (await req.json()) as RegistrationPayload;

    if (!payload?.email || !payload?.password || !payload?.role) {
      return new Response(JSON.stringify({ error: "Invalid registration payload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const fullName = payload.role === "ngo" ? payload.organizationName : payload.fullName;

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        role: payload.role,
        full_name: fullName,
      },
    });

    if (createUserError || !createdUser?.user?.id) {
      return new Response(
        JSON.stringify({ error: createUserError?.message ?? "Could not create pending user account." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = createdUser.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      role: payload.role,
      full_name: fullName,
      email: payload.email,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.role === "volunteer") {
      const encodedSkills = encodeVolunteerSkills(payload);
      const encodedAvailability = encodeVolunteerAvailability(payload);

      const volunteerRow = {
        user_id: userId,
        phone: payload.phone,
        location: payload.cityRegion || payload.location,
        skills: encodedSkills,
        availability: encodedAvailability,
        approval_status: "pending",
      };

      const { error: volunteerError } = await supabaseAdmin.from("volunteer_profiles").upsert(volunteerRow);

      if (volunteerError && isApprovalStatusMissingColumnError(volunteerError)) {
        const { error: fallbackVolunteerError } = await supabaseAdmin.from("volunteer_profiles").upsert({
          user_id: userId,
          phone: payload.phone,
          location: payload.cityRegion || payload.location,
          skills: encodedSkills,
          availability: encodedAvailability,
        });

        if (fallbackVolunteerError) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          return new Response(JSON.stringify({ error: fallbackVolunteerError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (volunteerError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ error: volunteerError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (payload.role === "ngo") {
      const encodedFocusArea = encodeNgoFocusArea(payload);

      const ngoRow = {
        user_id: userId,
        organization_name: payload.organizationName,
        contact_person: payload.contactPerson,
        phone: payload.phone,
        focus_area: encodedFocusArea,
        registration_number: payload.registrationNumber,
        approval_status: "pending",
      };

      const { error: ngoError } = await supabaseAdmin.from("ngo_profiles").upsert(ngoRow);

      if (ngoError && isApprovalStatusMissingColumnError(ngoError)) {
        const { error: fallbackNgoError } = await supabaseAdmin.from("ngo_profiles").upsert({
          user_id: userId,
          organization_name: payload.organizationName,
          contact_person: payload.contactPerson,
          phone: payload.phone,
          focus_area: encodedFocusArea,
          registration_number: payload.registrationNumber,
        });

        if (fallbackNgoError) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          return new Response(JSON.stringify({ error: fallbackNgoError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (ngoError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ error: ngoError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (payload.role === "donor") {
      const donorRow = {
        user_id: userId,
        phone: payload.phone,
        donor_type: payload.donorType,
        interests: payload.interests,
        approval_status: "pending",
      };

      const { error: donorError } = await supabaseAdmin.from("donor_profiles").upsert(donorRow);

      if (donorError && isApprovalStatusMissingColumnError(donorError)) {
        const { error: fallbackDonorError } = await supabaseAdmin.from("donor_profiles").upsert({
          user_id: userId,
          phone: payload.phone,
          donor_type: payload.donorType,
          interests: payload.interests,
        });

        if (fallbackDonorError) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          return new Response(JSON.stringify({ error: fallbackDonorError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (donorError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ error: donorError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
