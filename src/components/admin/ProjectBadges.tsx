import React from "react";

export interface ProjectStatusBadgeProps {
  status: "proposed" | "ongoing" | "completed" | string;
  className?: string;
  showDot?: boolean;
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({
  status,
  className = "",
  showDot = true,
}) => {
  const norm = (status || "").toLowerCase();

  if (norm === "ongoing") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#1E3A5F]/20 ${className}`}
      >
        {showDot && <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A5F] shrink-0" />}
        Ongoing
      </span>
    );
  }

  if (norm === "proposed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 ${className}`}
      >
        {showDot && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
        Proposed
      </span>
    );
  }

  if (norm === "completed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${className}`}
      >
        {showDot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />}
        Completed
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />}
      {status}
    </span>
  );
};

export interface ProjectCategoryBadgeProps {
  category?: string | null;
  className?: string;
}

export const ProjectCategoryBadge: React.FC<ProjectCategoryBadgeProps> = ({
  category,
  className = "",
}) => {
  if (!category || !category.trim()) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100/90 text-slate-700 border border-slate-200/70 tracking-tight ${className}`}
    >
      {category.trim()}
    </span>
  );
};
