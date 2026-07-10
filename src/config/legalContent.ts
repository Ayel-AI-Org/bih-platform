export const TERMS_AND_CONDITIONS_TEXT = {
  title: "Terms and Conditions of Service",
  effectiveDate: "July 2026",
  introduction: "Welcome to the Bridge for Impact Hub (BIH) platform (\"Platform\"). By accessing or registering an account on this Platform, users agree to be bound by these formal Terms and Conditions. If a user does not consent, they are restricted from utilizing our decentralized system infrastructure.",
  sections: [
    {
      heading: "1. Platform Intermediary Clarification",
      content: "The Bridge for Impact Hub provides a digital infrastructure connecting individual volunteers, registered non-governmental organizations (NGOs), and corporate or independent donors. BIH operates strictly as an administrative platform facilitator and technical clearinghouse. BIH does not directly employ volunteers, run individual partner organization projects, or assume operational liability for field initiatives."
    },
    {
      heading: "2. Stakeholder Account Responsibilities",
      bullets: [
        {
          role: "Volunteers",
          text: "Logging hours or milestones on the Platform constitutes community service and explicitly does not establish any form of legal employment relationship, union membership, or expectation of monetary compensation."
        },
        {
          role: "Partner NGOs",
          text: "Organizations retain absolute, exclusive liability for the environmental safety, training, and operational oversight of volunteers on active project sites. Documented fraud or systemic misrepresentation of hours logs will result in immediate termination of platform privileges."
        },
        {
          role: "Donors",
          text: "Financial operations are securely handled via the integrated Paystack API gateway. Contributions map dynamically to milestone transparency ledgers and are fully non-refundable under normal processing bounds."
        }
      ]
    },
    {
      heading: "3. Administrative Enforcement",
      content: "The system architecture grants the designated Super Admin ultimate override authority to freeze accounts, void disputed hours, or restrict user access parameters if a compliance breach occurs."
    }
  ]
};

export const PRIVACY_POLICY_TEXT = {
  title: "Privacy Policy & Data Protection Statement",
  effectiveDate: "July 2026",
  introduction: "At BIH, we prioritize protecting personal identifiers and data structures managed inside our distributed three-sided marketplace environment.",
  sections: [
    {
      heading: "1. Scope of Data Collection",
      content: "To safely execute automated dashboards, the platform securely stores profile attributes (Full names, contact info, region location, availability schedules, verified project logs, and historical aggregate donation tiers)."
    },
    {
      heading: "2. Payment Layer Protocols",
      content: "All donation transactions process safely using inline Paystack billing components. The platform database stores only transaction reference IDs, donation purpose descriptions, and receipts metadata; raw mobile money PINs, bank accounts, or credit card numbers are never held or handled on BIH servers."
    },
    {
      heading: "3. Data Retention & Privacy Assurance",
      content: "User profile information is shared exclusively with verified admin dashboards and directly assigned partner NGO coordinators. Personal datasets will never be shared with external third-party advertisers. Users retain rights to adjust details dynamically or invoke formal deletion commands through the System Administrator."
    }
  ]
};
