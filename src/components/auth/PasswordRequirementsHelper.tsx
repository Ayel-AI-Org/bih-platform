import React from "react";
import { Check, Circle } from "lucide-react";

interface PasswordRequirementsHelperProps {
  password?: string;
  className?: string;
}

export interface PasswordRules {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export const checkPasswordRules = (password: string = ""): PasswordRules => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };
};

export const isPasswordValid = (password: string = ""): boolean => {
  const rules = checkPasswordRules(password);
  return (
    rules.minLength &&
    rules.hasUppercase &&
    rules.hasLowercase &&
    rules.hasNumber &&
    rules.hasSpecialChar
  );
};

export const PasswordRequirementsHelper: React.FC<PasswordRequirementsHelperProps> = ({
  password = "",
  className = "",
}) => {
  const rules = checkPasswordRules(password);
  const hasTyped = password.length > 0;

  const requirements = [
    { label: "Be at least 8 characters long", met: rules.minLength },
    { label: "Include at least one uppercase letter", met: rules.hasUppercase },
    { label: "Include at least one lowercase letter", met: rules.hasLowercase },
    { label: "Include at least one number", met: rules.hasNumber },
    { label: "Include at least one special character", met: rules.hasSpecialChar },
  ];

  return (
    <div
      className={`rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 text-xs text-slate-600 transition-all ${className}`}
      aria-live="polite"
    >
      <p className="font-semibold text-slate-700 mb-1.5">Your password must:</p>
      <ul className="space-y-1">
        {requirements.map((req, idx) => {
          const isMet = hasTyped && req.met;
          return (
            <li
              key={idx}
              className={`flex items-center gap-1.5 transition-colors ${
                isMet
                  ? "text-emerald-700 font-medium"
                  : hasTyped
                  ? "text-slate-500"
                  : "text-slate-500"
              }`}
            >
              {isMet ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="h-2.5 w-2.5 text-slate-400 shrink-0 ml-0.5" aria-hidden="true" />
              )}
              <span className={isMet ? "line-through opacity-80" : ""}>{req.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordRequirementsHelper;
