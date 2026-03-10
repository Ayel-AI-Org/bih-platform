export type UserRole = "volunteer" | "ngo" | "donor" | "admin";

export type ProjectStatus = "proposed" | "ongoing" | "completed";

export type SuggestionStatus = "pending" | "approved" | "rejected";

export type PaymentMethod = "mobile_money" | "card";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface VolunteerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  skills: string;
  availability: string;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

export interface NgoProfile {
  id: string;
  organizationName: string;
  contactPerson: string;
  email: string;
  phone: string;
  focusArea: string;
  registrationNumber: string;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

export interface DonorProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  donorType: "individual" | "organization";
  interests: string;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  location: string;
  status: ProjectStatus;
  partners: string[];
  timeline: string;
  imageUrl: string;
}

export interface ProjectSuggestion {
  id: string;
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
  adminNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  status: SuggestionStatus;
}

export interface Donation {
  id: string;
  fullName: string;
  email: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  purpose: string;
  message?: string;
  createdAt: string;
  confirmationEmailStatus: "sent";
}

export interface MediaArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  category: string;
  publishedAt: string;
  imageUrl: string;
  imageUrls: string[];
  fullStoryUrl?: string;
}

export interface Session {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
}
