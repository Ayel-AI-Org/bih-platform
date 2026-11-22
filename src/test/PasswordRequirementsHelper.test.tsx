import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PasswordRequirementsHelper,
  checkPasswordRules,
  isPasswordValid,
} from "@/components/auth/PasswordRequirementsHelper";

describe("PasswordRequirementsHelper and Validation Rules", () => {
  it("correctly evaluates individual password criteria", () => {
    // Empty password
    const emptyRules = checkPasswordRules("");
    expect(emptyRules.minLength).toBe(false);
    expect(emptyRules.hasUppercase).toBe(false);
    expect(emptyRules.hasLowercase).toBe(false);
    expect(emptyRules.hasNumber).toBe(false);
    expect(emptyRules.hasSpecialChar).toBe(false);
    expect(isPasswordValid("")).toBe(false);

    // Only lowercase and short
    const simple = checkPasswordRules("abc");
    expect(simple.minLength).toBe(false);
    expect(simple.hasUppercase).toBe(false);
    expect(simple.hasLowercase).toBe(true);
    expect(simple.hasNumber).toBe(false);
    expect(simple.hasSpecialChar).toBe(false);
    expect(isPasswordValid("abc")).toBe(false);

    // Meets 8+ chars and lowercase, but missing upper, number, special
    const longOnlyLower = checkPasswordRules("abcdefghijk");
    expect(longOnlyLower.minLength).toBe(true);
    expect(longOnlyLower.hasUppercase).toBe(false);
    expect(longOnlyLower.hasNumber).toBe(false);
    expect(isPasswordValid("abcdefghijk")).toBe(false);

    // Fully compliant password
    const compliant = checkPasswordRules("ImpactHub2026!");
    expect(compliant.minLength).toBe(true);
    expect(compliant.hasUppercase).toBe(true);
    expect(compliant.hasLowercase).toBe(true);
    expect(compliant.hasNumber).toBe(true);
    expect(compliant.hasSpecialChar).toBe(true);
    expect(isPasswordValid("ImpactHub2026!")).toBe(true);
  });

  it("renders live requirement indicators in the UI", () => {
    const { rerender } = render(<PasswordRequirementsHelper password="" />);

    expect(screen.getByText("Your password must:")).toBeInTheDocument();
    expect(screen.getByText("Be at least 8 characters long")).toBeInTheDocument();
    expect(screen.getByText("Include at least one uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("Include at least one lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("Include at least one number")).toBeInTheDocument();
    expect(screen.getByText("Include at least one special character")).toBeInTheDocument();

    // Rerender with valid password
    rerender(<PasswordRequirementsHelper password="StrongPass123$" />);
    expect(screen.getByText("Be at least 8 characters long")).toBeInTheDocument();
    expect(screen.getByText("Include at least one uppercase letter")).toBeInTheDocument();
  });
});
