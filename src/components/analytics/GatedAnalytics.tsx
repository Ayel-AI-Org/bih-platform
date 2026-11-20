import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { useConsent } from "@/context/ConsentContext";

export const GatedAnalytics: React.FC = () => {
  const { hasResponded, categories } = useConsent();

  // If user has not explicitly consented to analytics, do not render or inject anything
  if (!hasResponded || !categories.analytics) {
    return null;
  }

  return (
    <Analytics
      beforeSend={(event) => {
        // Double-check active consent before transmitting any event
        if (!categories.analytics) {
          return null;
        }
        return event;
      }}
    />
  );
};

export default GatedAnalytics;
