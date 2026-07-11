import {
  type ApprovalStatus,
  type Donation,
  type DonorProfile,
  type MediaArticle,
  type NgoProfile,
  type Project,
  type ProjectStatus,
  type ProjectSuggestion,
  type Session,
  type SuggestionStatus,
  type VolunteerProfile,
} from "@/database/types";
import { supabase } from "@/database/client";

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function isApprovalStatusMissingColumnError(error: { message: string }) {
  const message = error.message.toLowerCase();
  return message.includes("approval_status")
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
}

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  status: ProjectStatus;
  partners: string[];
  timeline: string;
  image_url: string;
};

type SuggestionRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  timeline: string;
  submitted_by: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  category?: string | null;
  expected_budget?: number | null;
  beneficiaries?: string | null;
  admin_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  status: SuggestionStatus;
};

type DonationRow = {
  id: string;
  full_name: string;
  email: string;
  amount: number;
  currency: string;
  payment_method: "mobile_money" | "card";
  purpose: string;
  message?: string | null;
  created_at: string;
  confirmation_email_status: "sent";
};

type MediaRow = {
  id: string;
  title: string;
  summary: string;
  content?: string;
  author: string;
  category: string;
  published_at: string;
  image_url: string;
  full_story_url?: string | null;
};

type ProfileJoin = { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;

type RegistrationFunctionPayload =
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

const mapProject = (row: ProjectRow): Project => ({
  id: row.id,
  title: row.title,
  description: row.description,
  location: row.location,
  status: row.status,
  partners: row.partners,
  timeline: row.timeline,
  imageUrl: row.image_url,
});

const mapSuggestion = (row: SuggestionRow): ProjectSuggestion => ({
  id: row.id,
  title: row.title,
  description: row.description,
  location: row.location,
  timeline: row.timeline,
  submittedBy: row.submitted_by,
  email: row.email,
  phone: row.phone ?? undefined,
  organization: row.organization ?? undefined,
  category: row.category ?? undefined,
  expectedBudget: row.expected_budget ?? undefined,
  beneficiaries: row.beneficiaries ?? undefined,
  adminNotes: row.admin_notes ?? undefined,
  reviewedAt: row.reviewed_at ?? undefined,
  createdAt: row.created_at,
  status: row.status,
});

const mapDonation = (row: DonationRow): Donation => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  amount: Number(row.amount),
  currency: row.currency,
  paymentMethod: row.payment_method,
  purpose: row.purpose,
  message: row.message ?? undefined,
  createdAt: row.created_at,
  confirmationEmailStatus: row.confirmation_email_status,
});

const parseMediaImageUrls = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const urls = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      if (urls.length > 0) {
        return urls.slice(0, 3);
      }
    }
  } catch {
    // Backward compatibility: legacy rows store a single image URL string.
  }

  return value.trim() ? [value] : [];
};

const mapMedia = (row: MediaRow): MediaArticle => {
  const imageUrls = parseMediaImageUrls(row.image_url);
  const fallbackUrl = "https://source.unsplash.com/1600x900/?community,story";

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content?.trim() ? row.content : row.summary,
    author: row.author,
    category: row.category,
    publishedAt: row.published_at,
    imageUrl: imageUrls[0] ?? fallbackUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : [fallbackUrl],
    fullStoryUrl: row.full_story_url ?? undefined,
  };
};

const normalizeProfile = (profile: ProfileJoin) => {
  if (!profile) {
    return { fullName: "", email: "" };
  }

  if (Array.isArray(profile)) {
    const first = profile[0];
    return {
      fullName: first?.full_name ?? "",
      email: first?.email ?? "",
    };
  }

  return {
    fullName: profile.full_name ?? "",
    email: profile.email ?? "",
  };
};

const buildContextualProjectImageUrl = (payload: {
  title: string;
  description: string;
  location: string;
}) => {
  const text = `${payload.title} ${payload.description} ${payload.location}`.toLowerCase();

  const keywordMap: Array<{ match: RegExp; query: string }> = [
    { match: /water|borehole|sanitation/, query: "clean-water-community" },
    { match: /health|clinic|medical|wellness/, query: "community-healthcare" },
    { match: /school|education|training|skills|youth/, query: "education-community" },
    { match: /agri|farm|food|nutrition/, query: "sustainable-agriculture" },
    { match: /women|girls|gender/, query: "women-empowerment" },
    { match: /climate|tree|environment|recycle/, query: "environment-community" },
    { match: /housing|shelter|infrastructure|construction/, query: "community-development" },
  ];

  const matched = keywordMap.find((item) => item.match.test(text));
  const query = matched?.query ?? "community-impact";

  return `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`;
};

function encodeVolunteerSkills(payload: Extract<RegistrationFunctionPayload, { role: "volunteer" }>) {
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

function encodeVolunteerAvailability(payload: Extract<RegistrationFunctionPayload, { role: "volunteer" }>) {
  return JSON.stringify({
    availabilityText: payload.availability,
    availabilityBlocks: payload.availabilityBlocks,
    startDate: payload.startDate,
    commitmentDuration: payload.commitmentDuration,
    canTravel: payload.canTravel,
    maxTravelDistanceKm: payload.maxTravelDistanceKm ?? null,
  });
}

function encodeNgoFocusArea(payload: Extract<RegistrationFunctionPayload, { role: "ngo" }>) {
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

async function invokeFunctionWithErrorDetails<T>(functionName: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (!error) {
    return data as T;
  }

  let detail = error.message;
  const errorWithContext = error as { context?: { json?: () => Promise<{ error?: string }> } };

  if (errorWithContext.context?.json) {
    try {
      const contextBody = await errorWithContext.context.json();
      if (contextBody?.error) {
        detail = contextBody.error;
      }
    } catch {
      detail = error.message;
    }
  }

  throw new Error(detail);
}

const createAuthUser = async (payload: {
  email: string;
  password: string;
  role: Session["role"];
  fullName: string;
}) => {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: { role: payload.role, full_name: payload.fullName },
    },
  });

  throwIfError(error);

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Could not create user account.");
  }

  return userId;
};

const upsertProfile = async (payload: {
  userId: string;
  role: Session["role"];
  fullName: string;
  email: string;
}) => {
  const { error } = await supabase.from("profiles").upsert({
    id: payload.userId,
    role: payload.role,
    full_name: payload.fullName,
    email: payload.email,
  });

  throwIfError(error);
};

function shouldUseLocalRegistrationFallback(errorMessage: string) {
  const message = errorMessage.toLowerCase();
  return message.includes("registration-create-user")
    || message.includes("failed to send a request to the edge function")
    || message.includes("edge function returned a non-2xx")
    || message.includes("not found")
    || message.includes("no route matched");
}

async function submitRegistrationApplicationLocally(payload: RegistrationFunctionPayload) {
  if (payload.role === "volunteer") {
    const encodedSkills = encodeVolunteerSkills(payload);
    const encodedAvailability = encodeVolunteerAvailability(payload);

    const userId = await createAuthUser({
      email: payload.email,
      password: payload.password,
      role: "volunteer",
      fullName: payload.fullName,
    });

    await upsertProfile({
      userId,
      role: "volunteer",
      fullName: payload.fullName,
      email: payload.email,
    });

    const { error } = await supabase.from("volunteer_profiles").upsert({
      user_id: userId,
      phone: payload.phone,
      location: payload.cityRegion || payload.location,
      skills: encodedSkills,
      availability: encodedAvailability,
      approval_status: "pending" as ApprovalStatus,
    });

    if (!error) {
      return;
    }

    if (isApprovalStatusMissingColumnError(error)) {
      const { error: fallbackError } = await supabase.from("volunteer_profiles").upsert({
        user_id: userId,
        phone: payload.phone,
        location: payload.cityRegion || payload.location,
        skills: encodedSkills,
        availability: encodedAvailability,
      });

      throwIfError(fallbackError);
      return;
    }

    throw new Error(error.message);
  }

  if (payload.role === "ngo") {
    const encodedFocusArea = encodeNgoFocusArea(payload);

    const userId = await createAuthUser({
      email: payload.email,
      password: payload.password,
      role: "ngo",
      fullName: payload.organizationName,
    });

    await upsertProfile({
      userId,
      role: "ngo",
      fullName: payload.organizationName,
      email: payload.email,
    });

    const { error } = await supabase.from("ngo_profiles").upsert({
      user_id: userId,
      organization_name: payload.organizationName,
      contact_person: payload.contactPerson,
      phone: payload.phone,
      focus_area: encodedFocusArea,
      registration_number: payload.registrationNumber,
      approval_status: "pending" as ApprovalStatus,
    });

    if (!error) {
      return;
    }

    if (isApprovalStatusMissingColumnError(error)) {
      const { error: fallbackError } = await supabase.from("ngo_profiles").upsert({
        user_id: userId,
        organization_name: payload.organizationName,
        contact_person: payload.contactPerson,
        phone: payload.phone,
        focus_area: encodedFocusArea,
        registration_number: payload.registrationNumber,
      });

      throwIfError(fallbackError);
      return;
    }

    throw new Error(error.message);
  }

  const userId = await createAuthUser({
    email: payload.email,
    password: payload.password,
    role: "donor",
    fullName: payload.fullName,
  });

  await upsertProfile({
    userId,
    role: "donor",
    fullName: payload.fullName,
    email: payload.email,
  });

  const { error } = await supabase.from("donor_profiles").upsert({
    user_id: userId,
    phone: payload.phone,
    donor_type: payload.donorType,
    interests: payload.interests,
    approval_status: "pending" as ApprovalStatus,
  });

  if (!error) {
    return;
  }

  if (isApprovalStatusMissingColumnError(error)) {
    const { error: fallbackError } = await supabase.from("donor_profiles").upsert({
      user_id: userId,
      phone: payload.phone,
      donor_type: payload.donorType,
      interests: payload.interests,
    });

    throwIfError(fallbackError);
    return;
  }

  throw new Error(error.message);
}

async function submitRegistrationApplication(payload: RegistrationFunctionPayload) {
  try {
    await invokeFunctionWithErrorDetails<{ success: boolean }>("registration-create-user", payload);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (!shouldUseLocalRegistrationFallback(error.message)) {
      throw error;
    }

    try {
      await submitRegistrationApplicationLocally(payload);
    } finally {
      // MVP behavior: registration is submission-only, never an implicit login.
      await supabase.auth.signOut();
    }
  }
}

const resolveSessionProfile = async (userId: string, fallbackName: string, fallbackEmail: string) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  throwIfError(error);

  return {
    role: (profile?.role ?? "volunteer") as Session["role"],
    name: profile?.full_name ?? fallbackName,
    email: profile?.email ?? fallbackEmail,
  };
};

export async function initializePlatformData() {
  const { error } = await supabase.from("projects").select("id").limit(1);
  if (error) {
    throw new Error(error.message);
  }
}

export async function registerVolunteer(payload: {
  fullName: string;
  email: string;
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
  password: string;
}) {
  await submitRegistrationApplication({
    role: "volunteer",
    fullName: payload.fullName,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    location: payload.location,
    preferredContactChannels: payload.preferredContactChannels,
    nationality: payload.nationality,
    cityRegion: payload.cityRegion,
    availabilityBlocks: payload.availabilityBlocks,
    startDate: payload.startDate,
    commitmentDuration: payload.commitmentDuration,
    canTravel: payload.canTravel,
    maxTravelDistanceKm: payload.maxTravelDistanceKm,
    primarySkillCategories: payload.primarySkillCategories,
    yearsOfExperience: payload.yearsOfExperience,
    languagesSpoken: payload.languagesSpoken,
    pastExperience: payload.pastExperience,
    targetCommunities: payload.targetCommunities,
    dataPrivacyConsent: payload.dataPrivacyConsent,
    skills: payload.skills,
    availability: payload.availability,
  });
}

export async function registerNgo(payload: {
  organizationName: string;
  contactPerson: string;
  email: string;
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
  password: string;
}) {
  await submitRegistrationApplication({
    role: "ngo",
    organizationName: payload.organizationName,
    contactPerson: payload.contactPerson,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
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
    focusArea: payload.focusArea,
    registrationNumber: payload.registrationNumber,
  });
}

export async function registerDonor(payload: {
  fullName: string;
  email: string;
  phone: string;
  donorType: "individual" | "organization";
  interests: string;
  password: string;
}) {
  await submitRegistrationApplication({
    role: "donor",
    fullName: payload.fullName,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    donorType: payload.donorType,
    interests: payload.interests,
  });
}

export async function updateRegistrationApprovalStatus(payload: {
  role: "volunteer" | "ngo" | "donor";
  userId: string;
  status: ApprovalStatus;
}) {
  const tableMap = {
    volunteer: "volunteer_profiles",
    ngo: "ngo_profiles",
    donor: "donor_profiles",
  } as const;

  const table = tableMap[payload.role];
  const { error } = await supabase
    .from(table)
    .update({ approval_status: payload.status })
    .eq("user_id", payload.userId);

  throwIfError(error);
}

export async function sendRegistrationDecisionEmail(payload: {
  to: string;
  name: string;
  role: "Volunteer" | "NGO" | "Donor";
  status: ApprovalStatus;
  adminNote?: string;
  requestMoreInfo?: boolean;
}) {
  const { error } = await supabase.functions.invoke("registration-decision-email", {
    body: payload,
  });

  throwIfError(error);
}

export async function login(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  throwIfError(error);

  const user = data.user;
  if (!user) {
    throw new Error("Unable to resolve authenticated user.");
  }

  const profile = await resolveSessionProfile(
    user.id,
    (user.user_metadata.full_name as string | undefined) ?? user.email ?? "User",
    user.email ?? email,
  );

  return {
    userId: user.id,
    role: profile.role,
    name: profile.name,
    email: profile.email,
  };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error);
}

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  throwIfError(error);

  if (!session) {
    return null;
  }

  const user = session.user;
  const profile = await resolveSessionProfile(
    user.id,
    (user.user_metadata.full_name as string | undefined) ?? user.email ?? "User",
    user.email ?? "",
  );

  return {
    userId: user.id,
    role: profile.role,
    name: profile.name,
    email: profile.email,
  };
}

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, location, status, partners, timeline, image_url")
    .order("created_at", { ascending: false });

  throwIfError(error);

  return (data as ProjectRow[]).map(mapProject);
}

export async function getProjectById(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, location, status, partners, timeline, image_url")
    .eq("id", projectId)
    .maybeSingle();

  throwIfError(error);

  return data ? mapProject(data as ProjectRow) : undefined;
}

export async function getProjectsByStatus(status: ProjectStatus) {
  const allProjects = await getProjects();
  return allProjects.filter((project) => project.status === status);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId);

  throwIfError(error);
}

export async function suggestProject(payload: {
  title: string;
  description: string;
  location: string;
  timeline: string;
  submittedBy: string;
  email: string;
  phone?: string;
  organization?: string;
  category?: string;
  expectedBudget?: number;
  beneficiaries?: string;
}) {
  const { error } = await supabase.from("project_suggestions").insert({
    title: payload.title,
    description: payload.description,
    location: payload.location,
    timeline: payload.timeline,
    submitted_by: payload.submittedBy,
    email: payload.email,
    phone: payload.phone,
    organization: payload.organization,
    category: payload.category,
    expected_budget: payload.expectedBudget,
    beneficiaries: payload.beneficiaries,
    status: "pending" as SuggestionStatus,
  });

  if (!error) {
    return;
  }

  if (!error.message.includes("column") || !error.message.includes("does not exist")) {
    throw new Error(error.message);
  }

  const details: string[] = [];
  if (payload.phone) details.push(`Phone: ${payload.phone}`);
  if (payload.organization) details.push(`Organization: ${payload.organization}`);
  if (payload.category) details.push(`Category: ${payload.category}`);
  if (payload.expectedBudget !== undefined) details.push(`Expected Budget (GHS): ${payload.expectedBudget}`);
  if (payload.beneficiaries) details.push(`Beneficiaries: ${payload.beneficiaries}`);

  const fallbackDescription = details.length > 0
    ? `${payload.description}\n\nAdditional Submission Details:\n${details.join("\n")}`
    : payload.description;

  const { error: fallbackError } = await supabase.from("project_suggestions").insert({
    title: payload.title,
    description: fallbackDescription,
    location: payload.location,
    timeline: payload.timeline,
    submitted_by: payload.submittedBy,
    email: payload.email,
    status: "pending" as SuggestionStatus,
  });

  throwIfError(fallbackError);
}

export async function updateSuggestionStatus(suggestionId: string, status: SuggestionStatus, adminNotes?: string) {
  const { data: suggestion, error: suggestionError } = await supabase
    .from("project_suggestions")
    .select("id, title, description, location, timeline, submitted_by, email")
    .eq("id", suggestionId)
    .maybeSingle();

  throwIfError(suggestionError);

  if (!suggestion) {
    throw new Error("Suggestion not found.");
  }

  if (status === "approved") {
    const polished = await polishProjectSuggestion({
      title: suggestion.title,
      description: suggestion.description,
      location: suggestion.location,
      timeline: suggestion.timeline,
    });

    const { data: existingProject, error: existingProjectError } = await supabase
      .from("projects")
      .select("id")
      .eq("title", suggestion.title)
      .eq("location", suggestion.location)
      .eq("timeline", suggestion.timeline)
      .maybeSingle();

    throwIfError(existingProjectError);

    if (!existingProject) {
    const imageUrl = buildContextualProjectImageUrl({
      title: polished.title,
      description: polished.description,
      location: suggestion.location,
    });

    const { error: insertProjectError } = await supabase.from("projects").insert({
      title: polished.title,
      description: polished.description,
      location: suggestion.location,
      status: "proposed" as ProjectStatus,
      partners: ["Pending BIH Assignment"],
      timeline: suggestion.timeline,
      image_url: imageUrl,
    });

    throwIfError(insertProjectError);
    }
  }

  const { error: updateError } = await supabase
    .from("project_suggestions")
    .update({
      status,
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", suggestionId);

  if (updateError && updateError.message.includes("column") && updateError.message.includes("does not exist")) {
    const { error: fallbackUpdateError } = await supabase
      .from("project_suggestions")
      .update({ status })
      .eq("id", suggestionId);

    throwIfError(fallbackUpdateError);
  } else {
    throwIfError(updateError);
  }

  return {
    suggestionId,
    title: suggestion.title,
    submittedBy: suggestion.submitted_by,
    email: suggestion.email,
    status,
    adminNotes,
  };
}

export async function sendSuggestionDecisionEmail(payload: {
  to: string;
  submittedBy: string;
  title: string;
  status: "approved" | "rejected";
  adminNotes?: string;
}) {
  const { error } = await supabase.functions.invoke("suggestion-decision-email", {
    body: payload,
  });

  throwIfError(error);
}

export async function polishProjectSuggestion(payload: {
  title: string;
  description: string;
  location: string;
  timeline: string;
}) {
  const { data, error } = await supabase.functions.invoke("project-polish", {
    body: payload,
  });

  if (error || !data) {
    return {
      title: payload.title,
      description: payload.description,
    };
  }

  return {
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : payload.title,
    description: typeof data.description === "string" && data.description.trim() ? data.description.trim() : payload.description,
  };
}

export async function getAiChatReply(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const { data, error } = await supabase.functions.invoke("ai-chat-assistant", {
    body: { messages },
  });

  if (error) {
    let detail = error.message;

    const errorWithContext = error as { context?: { json?: () => Promise<{ error?: string }> } };
    if (errorWithContext.context?.json) {
      try {
        const contextBody = await errorWithContext.context.json();
        if (contextBody?.error) {
          detail = contextBody.error;
        }
      } catch {
        detail = error.message;
      }
    }

    throw new Error(detail);
  }

  const reply = data?.reply;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("AI assistant returned an empty reply.");
  }

  return reply.trim();
}

export async function createDonation(payload: {
  fullName: string;
  email: string;
  amount: number;
  currency: string;
  paymentMethod: "mobile_money" | "card";
  purpose: string;
  message?: string;
}) {
  const { error } = await supabase.from("donations").insert({
    full_name: payload.fullName,
    email: payload.email,
    amount: payload.amount,
    currency: payload.currency,
    payment_method: payload.paymentMethod,
    purpose: payload.purpose,
    message: payload.message,
    confirmation_email_status: "sent",
  });

  throwIfError(error);
}

export async function getVolunteers() {
  const { data, error } = await supabase
    .from("volunteer_profiles")
    .select("user_id, phone, location, skills, availability, approval_status, created_at, profiles!inner(full_name, email)")
    .order("created_at", { ascending: false });

  if (error && !isApprovalStatusMissingColumnError(error)) {
    throw new Error(error.message);
  }

  const rows = error
    ? (
      await supabase
        .from("volunteer_profiles")
        .select("user_id, phone, location, skills, availability, created_at, profiles!inner(full_name, email)")
        .order("created_at", { ascending: false })
    )
    : { data, error: null };

  throwIfError(rows.error);

  return (rows.data ?? []).map((item: {
    user_id: string;
    phone: string;
    location: string;
    skills: string;
    availability: string;
    approval_status?: ApprovalStatus;
    created_at: string;
    profiles: ProfileJoin;
  }) => {
    const profile = normalizeProfile(item.profiles);

    return ({
    id: item.user_id,
    fullName: profile.fullName,
    email: profile.email,
    phone: item.phone,
    location: item.location,
    skills: item.skills,
    availability: item.availability,
    approvalStatus: item.approval_status ?? "pending",
    createdAt: item.created_at,
  } satisfies VolunteerProfile);
  });
}

export async function getNgos() {
  const { data, error } = await supabase
    .from("ngo_profiles")
    .select("user_id, organization_name, contact_person, phone, focus_area, registration_number, approval_status, created_at, profiles!inner(email)")
    .order("created_at", { ascending: false });

  if (error && !isApprovalStatusMissingColumnError(error)) {
    throw new Error(error.message);
  }

  const rows = error
    ? (
      await supabase
        .from("ngo_profiles")
        .select("user_id, organization_name, contact_person, phone, focus_area, registration_number, created_at, profiles!inner(email)")
        .order("created_at", { ascending: false })
    )
    : { data, error: null };

  throwIfError(rows.error);

  return (rows.data ?? []).map((item: {
    user_id: string;
    organization_name: string;
    contact_person: string;
    phone: string;
    focus_area: string;
    registration_number: string;
    approval_status?: ApprovalStatus;
    created_at: string;
    profiles: ProfileJoin;
  }) => {
    const profile = normalizeProfile(item.profiles);

    return ({
    id: item.user_id,
    organizationName: item.organization_name,
    contactPerson: item.contact_person,
    email: profile.email,
    phone: item.phone,
    focusArea: item.focus_area,
    registrationNumber: item.registration_number,
    approvalStatus: item.approval_status ?? "pending",
    createdAt: item.created_at,
  } satisfies NgoProfile);
  });
}

export async function getDonors() {
  const { data, error } = await supabase
    .from("donor_profiles")
    .select("user_id, phone, donor_type, interests, approval_status, created_at, profiles!inner(full_name, email)")
    .order("created_at", { ascending: false });

  if (error && !isApprovalStatusMissingColumnError(error)) {
    throw new Error(error.message);
  }

  const rows = error
    ? (
      await supabase
        .from("donor_profiles")
        .select("user_id, phone, donor_type, interests, created_at, profiles!inner(full_name, email)")
        .order("created_at", { ascending: false })
    )
    : { data, error: null };

  throwIfError(rows.error);

  return (rows.data ?? []).map((item: {
    user_id: string;
    phone: string;
    donor_type: "individual" | "organization";
    interests: string;
    approval_status?: ApprovalStatus;
    created_at: string;
    profiles: ProfileJoin;
  }) => {
    const profile = normalizeProfile(item.profiles);

    return ({
    id: item.user_id,
    fullName: profile.fullName,
    email: profile.email,
    phone: item.phone,
    donorType: item.donor_type,
    interests: item.interests,
    approvalStatus: item.approval_status ?? "pending",
    createdAt: item.created_at,
  } satisfies DonorProfile);
  });
}

export async function getSuggestions() {
  const { data, error } = await supabase
    .from("project_suggestions")
    .select("id, title, description, location, timeline, submitted_by, email, phone, organization, category, expected_budget, beneficiaries, admin_notes, reviewed_at, created_at, status")
    .order("created_at", { ascending: false });

  if (!error) {
    return (data as SuggestionRow[]).map(mapSuggestion);
  }

  if (!error.message.includes("column") || !error.message.includes("does not exist")) {
    throw new Error(error.message);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("project_suggestions")
    .select("id, title, description, location, timeline, submitted_by, email, created_at, status")
    .order("created_at", { ascending: false });

  throwIfError(fallbackError);

  return (fallbackData as SuggestionRow[]).map(mapSuggestion);
}

export async function getDonations() {
  const { data, error } = await supabase
    .from("donations")
    .select("id, full_name, email, amount, currency, payment_method, purpose, message, created_at, confirmation_email_status")
    .order("created_at", { ascending: false });

  throwIfError(error);

  return (data as DonationRow[]).map(mapDonation);
}

export async function getMediaArticles() {
  const { data, error } = await supabase
    .from("media_articles")
    .select("id, title, summary, content, author, category, published_at, image_url, full_story_url")
    .order("published_at", { ascending: false });

  if (!error) {
    return (data as MediaRow[]).map(mapMedia);
  }

  if (!error.message.includes("column") || !error.message.includes("does not exist")) {
    throw new Error(error.message);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("media_articles")
    .select("id, title, summary, author, category, published_at, image_url")
    .order("published_at", { ascending: false });

  throwIfError(fallbackError);

  return (fallbackData as MediaRow[]).map(mapMedia);
}

export async function createMediaArticle(payload: {
  title: string;
  summary: string;
  content: string;
  author: string;
  category: string;
  publishedAt: string;
  imageUrls: string[];
  fullStoryUrl?: string;
}) {
  const imageUrls = payload.imageUrls.filter((item) => item.trim().length > 0).slice(0, 3);
  const storedImageValue = JSON.stringify(imageUrls);

  const { error } = await supabase.from("media_articles").insert({
    title: payload.title,
    summary: payload.summary,
    content: payload.content,
    author: payload.author,
    category: payload.category,
    published_at: payload.publishedAt,
    image_url: storedImageValue,
    full_story_url: payload.fullStoryUrl || null,
  });

  if (error && error.message.includes("full_story_url") && error.message.includes("does not exist")) {
    const { error: fallbackError } = await supabase.from("media_articles").insert({
      title: payload.title,
      summary: payload.summary,
      content: payload.content,
      author: payload.author,
      category: payload.category,
      published_at: payload.publishedAt,
      image_url: storedImageValue,
    });

    throwIfError(fallbackError);
    return;
  }

  throwIfError(error);
}

export async function getMediaArticleById(articleId: string) {
  const { data, error } = await supabase
    .from("media_articles")
    .select("id, title, summary, content, author, category, published_at, image_url, full_story_url")
    .eq("id", articleId)
    .maybeSingle();

  if (!error) {
    return data ? mapMedia(data as MediaRow) : undefined;
  }

  if (!error.message.includes("column") || !error.message.includes("does not exist")) {
    throw new Error(error.message);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("media_articles")
    .select("id, title, summary, author, category, published_at, image_url")
    .eq("id", articleId)
    .maybeSingle();

  throwIfError(fallbackError);

  return fallbackData ? mapMedia(fallbackData as MediaRow) : undefined;
}

export function exportRowsToCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    throw new Error("No data available for export.");
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number) => {
    const valueAsText = String(value);
    if (valueAsText.includes(",") || valueAsText.includes('"') || valueAsText.includes("\n")) {
      return `"${valueAsText.replace(/"/g, '""')}"`;
    }
    return valueAsText;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? "")).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function uploadStorageFile(bucket: string, path: string, file: File): Promise<string> {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("File size exceeds 25MB limit.");
  }
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  throwIfError(error);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

