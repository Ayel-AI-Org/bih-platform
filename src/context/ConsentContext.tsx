import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export const CONSENT_STORAGE_KEY = "bih_cookie_consent_v1";
export const CONSENT_VERSION = 1;

export interface ConsentCategories {
  essential: boolean; // Always true
  analytics: boolean; // Optional: Vercel Web Analytics
}

export interface StoredConsent {
  version: number;
  hasResponded: boolean;
  categories: ConsentCategories;
  timestamp: string;
}

export interface ConsentContextValue {
  hasResponded: boolean;
  categories: ConsentCategories;
  timestamp: string | null;
  version: number;
  isBannerOpen: boolean;
  isPreferencesOpen: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (categories: { analytics: boolean }) => void;
  withdrawConsent: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
  resetConsent: () => void;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

const cleanUpOptionalTechnologies = () => {
  if (typeof document === "undefined") return;

  // Remove Vercel Analytics injected script tags if present
  try {
    const scripts = document.head.querySelectorAll(
      'script[src*="_vercel/insights"], script[src*="va.vercel-scripts.com"]'
    );
    scripts.forEach((script) => script.remove());
  } catch {
    // Ignore DOM cleanup errors
  }

  // Clear runtime window analytics queue if defined
  if (typeof window !== "undefined") {
    try {
      const win = window as unknown as { va?: unknown; vaq?: unknown[] };
      delete win.va;
      delete win.vaq;
    } catch {
      // Ignore
    }
  }
};

const getStoredConsent = (): StoredConsent | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === CONSENT_VERSION &&
      typeof parsed.hasResponded === "boolean" &&
      parsed.categories &&
      typeof parsed.categories.essential === "boolean"
    ) {
      return {
        version: parsed.version,
        hasResponded: parsed.hasResponded,
        categories: {
          essential: true,
          analytics: Boolean(parsed.categories.analytics),
        },
        timestamp: parsed.timestamp || new Date().toISOString(),
      };
    }
  } catch {
    // Invalid JSON or storage access error
  }
  return null;
};

const persistConsent = (categories: { analytics: boolean }) => {
  const payload: StoredConsent = {
    version: CONSENT_VERSION,
    hasResponded: true,
    categories: {
      essential: true,
      analytics: Boolean(categories.analytics),
    },
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Unable to persist cookie consent to localStorage:", error);
  }

  return payload;
};

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consentState, setConsentState] = useState<StoredConsent>(() => {
    const stored = getStoredConsent();
    if (stored) {
      return stored;
    }
    return {
      version: CONSENT_VERSION,
      hasResponded: false,
      categories: {
        essential: true,
        analytics: false,
      },
      timestamp: "",
    };
  });

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Sync state if another tab modifies consent
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY) {
        const updated = getStoredConsent();
        if (updated) {
          setConsentState(updated);
          if (!updated.categories.analytics) {
            cleanUpOptionalTechnologies();
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const acceptAll = useCallback(() => {
    const saved = persistConsent({ analytics: true });
    setConsentState(saved);
    setIsPreferencesOpen(false);
  }, []);

  const rejectOptional = useCallback(() => {
    cleanUpOptionalTechnologies();
    const saved = persistConsent({ analytics: false });
    setConsentState(saved);
    setIsPreferencesOpen(false);
  }, []);

  const savePreferences = useCallback((categories: { analytics: boolean }) => {
    if (!categories.analytics) {
      cleanUpOptionalTechnologies();
    }
    const saved = persistConsent(categories);
    setConsentState(saved);
    setIsPreferencesOpen(false);
  }, []);

  const withdrawConsent = useCallback(() => {
    rejectOptional();
  }, [rejectOptional]);

  const openPreferences = useCallback(() => {
    setIsPreferencesOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setIsPreferencesOpen(false);
  }, []);

  const resetConsent = useCallback(() => {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // Ignore
    }
    cleanUpOptionalTechnologies();
    setConsentState({
      version: CONSENT_VERSION,
      hasResponded: false,
      categories: {
        essential: true,
        analytics: false,
      },
      timestamp: "",
    });
    setIsPreferencesOpen(false);
  }, []);

  const contextValue = useMemo<ConsentContextValue>(
    () => ({
      hasResponded: consentState.hasResponded,
      categories: consentState.categories,
      timestamp: consentState.timestamp || null,
      version: consentState.version,
      isBannerOpen: !consentState.hasResponded,
      isPreferencesOpen,
      acceptAll,
      rejectOptional,
      savePreferences,
      withdrawConsent,
      openPreferences,
      closePreferences,
      resetConsent,
    }),
    [
      consentState,
      isPreferencesOpen,
      acceptAll,
      rejectOptional,
      savePreferences,
      withdrawConsent,
      openPreferences,
      closePreferences,
      resetConsent,
    ]
  );

  return <ConsentContext.Provider value={contextValue}>{children}</ConsentContext.Provider>;
};

export const useConsent = (): ConsentContextValue => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return context;
};
