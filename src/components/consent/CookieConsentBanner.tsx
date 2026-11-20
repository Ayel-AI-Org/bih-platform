import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useConsent } from "@/context/ConsentContext";
import { Button } from "@/components/ui/button";

export const CookieConsentBanner: React.FC = () => {
  const { isBannerOpen, acceptAll, rejectOptional, openPreferences } = useConsent();

  if (!isBannerOpen) {
    return null;
  }

  return (
    <aside
      aria-label="Privacy and cookie consent"
      role="region"
      className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 md:p-5 pointer-events-none motion-safe:animate-fade-in-up motion-reduce:transform-none"
    >
      <div className="pointer-events-auto mx-auto max-w-5xl rounded-xl border border-slate-200/90 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-md p-4 sm:p-5 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Information & Brand Copy */}
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] dark:bg-accent/20 dark:text-accent">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#1E3A5F] dark:text-white">
                Your privacy matters to <span className="text-accent">BIH</span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We use essential cookies to keep our website working. With your permission, we may also use optional
              cookies to understand website usage and improve your experience. Learn more in our{" "}
              <Link
                to="/privacy"
                className="font-semibold text-[#1E3A5F] dark:text-accent underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <Button
              type="button"
              onClick={acceptAll}
              className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-medium text-xs sm:text-sm px-4 py-2 shadow-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label="Accept all cookies including analytics"
            >
              Accept all
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={rejectOptional}
              className="w-full sm:w-auto border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs sm:text-sm px-4 py-2 focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
              aria-label="Reject optional cookies and keep only essential cookies"
            >
              Reject optional
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={openPreferences}
              className="w-full sm:w-auto text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs sm:text-sm px-3 py-2 flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label="Customize cookie categories"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Customize</span>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CookieConsentBanner;
