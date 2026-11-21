import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export interface AccountStatusBadgeProps {
  status: "pending" | "approved" | "rejected" | "active" | string;
  className?: string;
}

export const AccountStatusBadge: React.FC<AccountStatusBadgeProps> = ({ status, className = "" }) => {
  const norm = (status || "").toLowerCase();

  if (norm === "approved" || norm === "active") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
        Approved
      </span>
    );
  }

  if (norm === "pending") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
        Pending Review
      </span>
    );
  }

  if (norm === "rejected") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
        Rejected
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
      {status}
    </span>
  );
};

export interface AccountRoleBadgeProps {
  role: string;
  className?: string;
}

export const AccountRoleBadge: React.FC<AccountRoleBadgeProps> = ({ role, className = "" }) => {
  const norm = (role || "").toLowerCase();

  switch (norm) {
    case "super_admin":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-900 border border-purple-200/80 ${className}`}
        >
          <ShieldAlert className="h-3 w-3 text-purple-600 shrink-0" />
          Super Admin
        </span>
      );
    case "admin":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#1E3A5F]/20 ${className}`}
        >
          <ShieldCheck className="h-3 w-3 text-[#1E3A5F] shrink-0" />
          Staff Admin
        </span>
      );
    case "ngo":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50/90 text-amber-900 border border-amber-200/80 ${className}`}
        >
          NGO Partner
        </span>
      );
    case "donor":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/80 ${className}`}
        >
          Donor
        </span>
      );
    case "volunteer":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70 ${className}`}
        >
          Volunteer
        </span>
      );
  }
};
