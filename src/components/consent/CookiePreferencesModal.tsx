import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, BarChart2, Info, Lock } from "lucide-react";
import { useConsent } from "@/context/ConsentContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const CookiePreferencesModal: React.FC = () => {
  const {
    isPreferencesOpen,
    closePreferences,
    categories,
    savePreferences,
    acceptAll,
    rejectOptional,
  } = useConsent();

  // Internal state while user is adjusting options in the dialog
  const [analyticsEnabled, setAnalyticsEnabled] = useState(categories.analytics);

  // Sync internal state whenever the dialog opens or stored categories change
  useEffect(() => {
    if (isPreferencesOpen) {
      setAnalyticsEnabled(categories.analytics);
    }
  }, [isPreferencesOpen, categories.analytics]);

  const handleSave = () => {
    savePreferences({ analytics: analyticsEnabled });
  };

  const handleAcceptAll = () => {
    acceptAll();
  };

  const handleRejectOptional = () => {
    rejectOptional();
  };

  return (
    <Dialog open={isPreferencesOpen} onOpenChange={(open) => !open && closePreferences()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4 text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] dark:bg-accent/20 dark:text-accent">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <DialogTitle className="text-xl font-serif font-bold text-[#1E3A5F] dark:text-white">
              Cookie & Privacy Preferences
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            We value your transparency and control over your data. Review the categories below to customize your
            choices. You may update or withdraw your consent at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category 1: Essential Technologies */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#1E3A5F] dark:text-accent shrink-0" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Essential Technologies
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-[#1E3A5F]/10 text-[#1E3A5F] dark:bg-accent/20 dark:text-accent text-[11px] font-medium"
                >
                  Always Active
                </Badge>
                <Switch
                  checked={true}
                  disabled={true}
                  aria-label="Essential technologies (cannot be disabled)"
                  className="data-[state=checked]:bg-[#1E3A5F] opacity-75 cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Required for the website to function securely and reliably. These include authentication tokens, security protections, donation checkout readiness, and functional UI settings like
              sidebar layout and completed onboarding prompts.
            </p>
          </div>

          {/* Category 2: Analytics & Performance */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-800/70 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#1E3A5F] dark:text-accent shrink-0" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Analytics & Usage
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 text-[11px]"
                >
                  Optional
                </Badge>
                <Switch
                  id="analytics-toggle"
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                  aria-label="Toggle optional analytics tracking"
                  className="data-[state=checked]:bg-[#1E3A5F]"
                />
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Enables privacy-focused usage metrics to help us measure aggregate traffic,
              monitor system health, and improve loading speeds. No cross-site advertising, individual tracking, or
              personal identifiers are collected.
            </p>
          </div>

          {/* Transparent Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-md bg-blue-50/60 dark:bg-blue-950/30 text-slate-700 dark:text-slate-300 text-xs border border-blue-100 dark:border-blue-900/50">
            <Info className="w-4 h-4 text-[#1E3A5F] dark:text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Bridge for Impact Hub does not deploy third-party advertising cookies, retargeting pixels, or behavioral
              marketing trackers. For more details, consult our{" "}
              <Link
                to="/privacy"
                onClick={closePreferences}
                className="font-medium text-[#1E3A5F] dark:text-accent underline underline-offset-2 hover:opacity-80"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleRejectOptional}
            className="w-full sm:w-auto text-xs sm:text-sm border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Reject Optional
          </Button>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleAcceptAll}
              className="w-full sm:w-auto text-xs sm:text-sm border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Accept All
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-medium text-xs sm:text-sm shadow-sm"
            >
              Save Preferences
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CookiePreferencesModal;
