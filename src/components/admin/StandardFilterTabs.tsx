import React from "react";

export interface FilterTabOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface StandardFilterTabsProps<T extends string = string> {
  value: T;
  onChange: (val: T) => void;
  options: FilterTabOption<T>[];
  className?: string;
  ariaLabel?: string;
}

export function StandardFilterTabs<T extends string = string>({
  value,
  onChange,
  options,
  className = "",
  ariaLabel = "Filter options",
}: StandardFilterTabsProps<T>) {
  return (
    <div className={`overflow-x-auto scrollbar-none -mb-px ${className}`}>
      <div
        aria-label={ariaLabel}
        className="inline-flex items-center bg-slate-100/90 rounded-t-lg rounded-b-none border-b border-slate-200 p-0 gap-0.5"
      >
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-t-lg rounded-b-none border-b-2 px-3.5 sm:px-4 py-2 text-xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1E3A5F] ${
                isActive
                  ? "border-[#D4A017] text-[#1E3A5F] bg-white font-semibold shadow-none"
                  : "border-transparent text-slate-600 font-medium hover:text-slate-800 hover:bg-slate-50/60"
              }`}
            >
              <span>{opt.label}</span>
              {typeof opt.count === "number" && (
                <span
                  className={`ml-1.5 text-[11px] font-mono ${
                    isActive ? "text-[#1E3A5F] font-bold" : "text-slate-500 font-normal"
                  }`}
                >
                  ({opt.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
