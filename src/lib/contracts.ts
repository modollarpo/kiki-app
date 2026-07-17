// ============================================================
// KIKI Agent Platform — Contract & Document Library
// Single source of truth for every downloadable legal,
// commercial, compliance, and technical document. The
// Compliance Hub (/contracts) and NDA page pull real content
// from here so generated PDFs are never empty stubs.
//
// Documents are structured as branded sections so both the
// in-app viewer and the generated PDF render with consistent
// headings, intros, and KIKI Agent / STOREGRILL INC LTD branding.
// ============================================================

export interface DocSection {
  heading: string;
  body: string[];
}

export interface ContractDoc {
  title: string;
  version: string;
  effective: string;
  /** Branded one-line summary shown under the title in the PDF header. */
  intro?: string;
  /** Structured sections. Rendered with headings + body paragraphs. */
  sections?: DocSection[];
  /** Legacy flat content kept for backward compatibility with older callers. */
  content?: string[];
}

export const CONTRACTS: Record<string, ContractDoc> = {
  "terms-of-service": {
    title: "Terms of Service",
    version: "v2.4",
    effective: "March 20, 2026",
    intro: "The agreement governing your use of the KIKI Agent platform, autonomous LTV optimization, and related services.",
    sections: [
      { heading: "1. Acceptance of Terms", body: [
        "These Terms of Service (\"Terms\") constitute a binding agreement between you (\"Customer\", \"you\") and KIKI Agent, a product of STOREGRILL INC LTD (Company No. 14581073, registered in England & Wales) (\"KIKI\", \"we\", \"us\"). References to \"KIKI\" mean the operating brand of STOREGRILL INC LTD.",
        "These Terms govern access to and use of the KIKI Agent platform, including its websites, APIs, dashboards, AI agents, virtual cards, and related services (collectively, the \"Service\"). By creating an account or using the Service you agree to these Terms and our Privacy Policy.",
      ]},
      { heading: "2. Description of Service", body: [
        "KIKI provides an autonomous Lifetime Value (LTV) optimization platform. The Service ingests first-party conversion signals via our Conversions API (CAPI) pipeline, builds LTV prediction models, and operates a suite of AI agents (Acquisition, Retention, Creative, Audience, Bidding, and Insight) that optimize advertising spend across connected platforms. Optimization-as-a-Service (OaaS) engagements are governed additionally by the OaaS Master Services Agreement.",
      ]},
      { heading: "3. Accounts & Eligibility", body: [
        "You must be at least 18 years old and authorized to bind your organization. You are responsible for safeguarding credentials, for all activity under your account, and for keeping billing and contact information current. Each registered tenant is isolated; you may not access data belonging to other tenants.",
      ]},
      { heading: "4. Plans & Billing", body: [
        "Fees are set out in your selected plan (Starter, Growth, Enterprise) or OaaS agreement. Subscriptions auto-renew unless cancelled. Usage above included signals or tokens is metered at the overage rates published in plan pricing. Invoices are issued monthly; payment is due within 14 days. Late balances accrue interest at 1.5% per month. We may suspend the Service for non-payment after a 7-day cure notice.",
      ]},
      { heading: "5. Virtual Cards & Spend Control", body: [
        "KIKI may issue virtual cards backed by your wallet balance to fund advertising accounts. Cards are capped per campaign and may be frozen automatically when a campaign's actual CAC exceeds its target CAC by more than the configured threshold. You remain liable for all legitimate ad spend charged to issued cards.",
      ]},
      { heading: "6. Acceptable Use", body: [
        "You will not (a) use the Service for unlawful, deceptive, or discriminatory advertising; (b) attempt to reverse-engineer our models or circumvent rate limits; (c) upload personally identifiable information of minors; (d) resell the Service without a reseller agreement; or (e) use the Service to build a competing product. We may remove content or terminate accounts that violate this section.",
      ]},
      { heading: "7. Data & Privacy", body: [
        "You retain all rights to customer data you submit. We process personal data only as a processor under our Data Processing Addendum. We do not train foundational third-party models on your customer data, and AI sub-processors operate under zero-retention DPAs. See the Privacy Policy for retention, deletion, and regional storage details.",
      ]},
      { heading: "8. AI Disclaimer", body: [
        "The Service makes automated optimization decisions using statistical models. While designed to improve ROAS and LTV, results are not guaranteed. You are solely responsible for the legality and accuracy of the ads, offers, and landing experiences you run, including compliance with platform and advertising regulations.",
      ]},
      { heading: "9. Intellectual Property", body: [
        "KIKI retains all rights to the Service, models, agents, and documentation. Customer data and Customer-owned creative remain your property. Feedback you provide may be used to improve the Service without obligation to you.",
      ]},
      { heading: "10. Limitation of Liability", body: [
        "To the maximum extent permitted by law, KIKI's aggregate liability arising from the Service shall not exceed the fees you paid in the 12 months preceding the claim. Neither party is liable for indirect, incidental, or consequential damages. Nothing limits liability for breach of confidentiality, indemnity, or gross negligence.",
      ]},
      { heading: "11. Term & Termination", body: [
        "You may cancel at any time; paid periods are non-refundable except as required by law. We may terminate for material breach after a 30-day notice. Upon termination we will make your data exportable for 30 days, after which it is deleted per the retention schedule.",
      ]},
      { heading: "12. Governing Law", body: [
        "These Terms are governed by the laws of England & Wales, without regard to conflict-of-law principles. The parties consent to the exclusive jurisdiction of the courts of England & Wales.",
      ]},
      { heading: "13. Changes", body: [
        "We may update these Terms; material changes are notified by email at least 30 days before they take effect. Continued use after that date constitutes acceptance.",
      ]},
    ],
  },

  "privacy-policy": {
    title: "Privacy Policy",
    version: "2026.1",
    effective: "March 20, 2026",
    sections: [
      { heading: "1. WHO WE ARE", body: ["KIKI Agent is a privacy-first marketing optimization platform and a product of STOREGRILL INC LTD (Company No. 14581073, registered in England & Wales). This Policy explains what personal data we collect, why, how long we keep it, and the rights you have. Our registered address is Coventry, CV3 2FP, England."] },
      { heading: "2. SCOPE", body: ["This Policy applies to visitors of kiki.ai, account holders (our Customers), and the end consumers whose data Customers process through the Service (data subjects). For data subjects, KIKI acts as a processor under the instructions of the Customer, who is the controller. For website visitors and account holders, KIKI is the controller."] },
      { heading: "3. DATA WE COLLECT", body: ["(a) Account data: name, email, company, billing details. (b) Signal data: conversion events, click identifiers, hashed emails, device and attribution metadata sent through the CAPI pipeline. (c) Derived data: LTV scores, audience segments, and model features computed from signal data. (d) Technical data: IP address, browser, and usage telemetry used for security and product analytics."] },
      { heading: "4. LEGAL BASIS (GDPR)", body: ["We rely on: contractual necessity to provide the Service; legitimate interests for security and analytics (balanced against your rights); and consent for non-essential marketing cookies. You may withdraw consent at any time without affecting prior processing."] },
      { heading: "5. HOW WE USE DATA", body: ["To operate and secure the Service, compute LTV predictions, optimize campaigns, detect fraud and invalid traffic, issue virtual cards, produce invoices, and comply with legal obligations. We do not sell personal data. We do not use Customer data to train third-party foundational models."] },
      { heading: "6. SUB-PROCESSORS", body: ["We engage vetted sub-processors (Microsoft Azure, Stripe, OpenAI, Anthropic, Google Vertex AI, Meta Llama, SendGrid, DataDog, PostHog). Each operates under a written contract with security and confidentiality obligations; AI sub-processors are bound by zero-retention DPAs. The current list is maintained on the Compliance Hub."] },
      { heading: "7. INTERNATIONAL TRANSFERS", body: ["Data may be processed in the US, EU, APAC, and other regions where sub-processors operate. Transfers from the EEA/UK rely on Standard Contractual Clauses and supplementary measures including encryption and access controls."] },
      { heading: "8. RETENTION", body: ["Account data is retained for the life of the contract plus 90 days. Signal and derived data are retained per the Customer's configured retention window (default 24 months) and deleted on contract termination. Backups are purged within 35 days."] },
      { heading: "9. YOUR RIGHTS", body: ["Depending on your jurisdiction you may access, correct, delete, port, restrict, or object to processing, and lodge a complaint with a supervisory authority. EU/UK residents may contact our representative; California residents may exercise CCPA rights without discrimination. Requests: privacy@kiki.ai."] },
      { heading: "10. SECURITY", body: ["We apply encryption in transit (TLS 1.2+) and at rest (AES-256), role-based access control, MFA for staff, network segmentation, and continuous monitoring. We are SOC 2 Type II certified and undergo annual third-party penetration testing."] },
      { heading: "11. CONTACT", body: ["Privacy Officer: privacy@kiki.ai. KIKI Agent is a product of STOREGRILL INC LTD, Company No. 14581073, registered in England & Wales (Coventry, CV3 2FP, England). EU Representative: KIKI Agent EU Ltd., Dublin, Ireland. UK Representative: KIKI Agent UK Ltd., London, UK."] },
      { heading: "12. CHANGES", body: ["We will post material changes here and notify Customers by email at least 30 days in advance."] }
    ],
  },

  "data-processing-addendum": {
    title: "Data Processing Addendum",
    version: "v3.1",
    effective: "February 1, 2026",
    sections: [
      { heading: "1. PURPOSE", body: ["This Data Processing Addendum (\"DPA\") forms part of the Agreement between KIKI Agent, a product of STOREGRILL INC LTD (\"Processor\") and the Customer (\"Controller\") and reflects the parties' obligations under Article 28 of the EU General Data Protection Regulation (GDPR) and equivalent UK and Swiss laws."] },
      { heading: "2. DEFINITIONS", body: ["Capitalized terms not defined here have the meaning given in the GDPR. \"Personal Data\", \"Processing\", \"Data Subject\", \"Controller\", and \"Processor\" carry their GDPR meanings. \"Sub-processor\" means a third party engaged by the Processor to Process Personal Data."] },
      { heading: "3. SCOPE OF PROCESSING", body: ["The subject matter is operation of the KIKI platform. The duration is the term of the Agreement. The nature and purpose is marketing optimization, LTV modelling, and fraud detection. The categories of Data Subjects are the Controller's customers and website visitors. The categories of Personal Data are set out in the Privacy Policy."] },
      { heading: "4. PROCESSOR OBLIGATIONS", body: ["The Processor shall (a) Process Personal Data only on documented instructions from the Controller, including this DPA; (b) ensure persons Processing the data are bound by confidentiality; (c) implement the technical and organizational measures in Annex I; (d) assist the Controller with data-subject requests; (e) assist with breach notification; and (f) delete or return Personal Data at the end of services."] },
      { heading: "5. CONTROLLER INSTRUCTIONS", body: ["The Controller instructs the Processor to Process Personal Data to provide the Service, including sharing with Sub-processors listed in Annex II, and to transfer data internationally under the safeguards in Section 8. The Controller is responsible for the lawfulness of source data and any disclosures to the Processor."] },
      { heading: "6. SUB-PROCESSORS", body: ["The Controller grants general written authorization for the Sub-processors listed in Annex II. The Processor shall impose data-protection obligations on Sub-processors no less protective than this DPA and remain liable for their performance. The Processor will notify the Controller of additions or replacements at least 30 days in advance, during which the Controller may object."] },
      { heading: "7. SECURITY MEASURES", body: ["The Processor maintains: encryption in transit and at rest; least-privilege access with MFA; network segmentation; logging and monitoring; vulnerability management; and a documented incident-response plan. Details are in Annex I and the Security Whitepaper."] },
      { heading: "8. INTERNATIONAL TRANSFERS", body: ["Transfers outside the EEA/UK/Switzerland are made under Standard Contractual Clauses (Module 2 and 3) and supplemented by technical measures including pseudonymization and zero-retention AI inference."] },
      { heading: "9. DATA SUBJECT RIGHTS", body: ["The Processor shall assist the Controller by technical and organizational means to respond to Data Subject requests, including through access controls and data export tooling, taking into account the nature of Processing."] },
      { heading: "10. PERSONAL DATA BREACH", body: ["The Processor shall notify the Controller without undue delay and in any event within 72 hours of becoming aware of a Personal Data Breach, providing information necessary for the Controller to meet its own notification obligations."] },
      { heading: "11. AUDIT", body: ["The Processor shall make available all information necessary to demonstrate compliance and allow for audits or inspections conducted by the Controller or an independent auditor, subject to reasonable confidentiality undertakings."] },
      { heading: "12. TERMINATION", body: ["On termination, the Processor shall delete all Personal Data or return it at the Controller's election, and delete existing copies unless Union or Member State law requires storage."] }
    ],
  },

  "mutual-nda": {
    title: "Mutual Non-Disclosure Agreement",
    version: "v1.2",
    effective: "January 15, 2026",
    sections: [
      { heading: "1. PURPOSE", body: ["This Mutual Non-Disclosure Agreement (\"Agreement\") governs the exchange of Confidential Information between KIKI Agent, a product of STOREGRILL INC LTD (\"KIKI\"), and the receiving party (\"Recipient\") for the purpose of evaluating a potential business relationship, including but not limited to integration partnerships, OaaS engagements, enterprise subscriptions, and reseller arrangements."] },
      { heading: "2. DEFINITION OF CONFIDENTIAL INFORMATION", body: ["\"Confidential Information\" means any technical, business, financial, or operational information disclosed by either party that is designated as confidential or should reasonably be understood to be confidential. This includes AI model architectures, pricing strategies, customer data, business roadmaps, and unpublished financial data."] },
      { heading: "3. OBLIGATIONS", body: ["Each party agrees to: (a) hold Confidential Information in strict confidence using at least the same degree of care as it uses to protect its own confidential information (but not less than reasonable care); (b) not disclose Confidential Information to any third party without prior written consent; (c) use Confidential Information solely for the Purpose."] },
      { heading: "4. EXCLUSIONS", body: ["Obligations do not apply to information that: (a) is or becomes publicly known through no fault of the Recipient; (b) was rightfully known to the Recipient prior to disclosure; (c) is independently developed by the Recipient without use of Confidential Information; (d) is required to be disclosed by law or court order (with prior written notice where permitted)."] },
      { heading: "5. TERM", body: ["This Agreement is effective upon signature and continues for 3 years. Obligations with respect to Confidential Information disclosed during the term survive for an additional 3 years following termination. KIKI's source code and AI model weights are protected indefinitely."] },
      { heading: "6. REMEDIES", body: ["The parties acknowledge that breach of this Agreement may cause irreparable harm for which monetary damages would be inadequate. Either party may seek injunctive relief without the requirement to post a bond. This does not limit other remedies available at law or equity."] },
      { heading: "7. GOVERNING LAW", body: ["This Agreement shall be governed by the laws of England & Wales, without regard to conflict of law provisions. Disputes shall be resolved in the courts of England & Wales."] },
      { heading: "8. SIGNATURES", body: ["This Agreement may be executed electronically and in counterparts. By signing below, each party acknowledges that it has read, understood, and agrees to be bound by the terms of this Agreement."] }
    ],
  },

  "oaas-msa": {
    title: "Optimization-as-a-Service Master Services Agreement",
    version: "v1.0",
    effective: "March 1, 2026",
    sections: [
      { heading: "1. ENGAGEMENT", body: ["This OaaS Master Services Agreement (\"Agreement\") governs Optimization-as-a-Service engagements where KIKI operates the Customer's paid acquisition campaigns end-to-end using its autonomous AI agents. It supplements the Terms of Service and applies where the Customer selects the OaaS plan."] },
      { heading: "2. SCOPE OF SERVICES", body: ["KIKI will (a) connect the Customer's ad accounts and CAPI pipelines; (b) build and maintain LTV prediction models; (c) run the Acquisition, Retention, Creative, Audience, Bidding, and Insight agents 24/7; (d) issue virtual cards to fund spend within approved caps; and (e) deliver a monthly P&L and quarterly business review."] },
      { heading: "3. PERFORMANCE TARGETS", body: ["Each engagement sets a contractual baseline ROAS and an uplift target (e.g., +15% ROAS over the trailing 90-day baseline). KIKI reports actual vs. target monthly. Targets are re-baselined at each quarterly business review to reflect market conditions."] },
      { heading: "4. FEES", body: ["The Customer pays (a) a management fee equal to 1.35% of managed ad spend, and (b) a performance bonus equal to 5% of incremental revenue uplift above the contractual baseline. Both are calculated on verified platform spend and revenue and invoiced monthly."] },
      { heading: "5. SPEND AUTHORITY & CARDS", body: ["KIKI funds campaigns via virtual cards drawn from the Customer's prefunded wallet. Per-campaign caps and a global monthly cap are agreed in the Order Form. KIKI may pause a campaign whose actual CAC exceeds target CAC by more than 20% pending Customer approval."] },
      { heading: "6. CUSTOMER RESPONSIBILITIES", body: ["The Customer provides accurate tracking, grants platform access, supplies creative assets or approves KIKI-generated creative, and maintains sufficient wallet balance. The Customer remains the advertiser of record and owns all ad-account relationships."] },
      { heading: "7. DATA & IP", body: ["Customer data remains the Customer's property. KIKI retains ownership of its agents, models, and methodology. Optimized audiences and strategies created during the engagement are licensed to the Customer for the duration of the engagement."] },
      { heading: "8. COMPLIANCE", body: ["All activity complies with platform policies, applicable advertising law, and the DPA. KIKI will not run prohibited verticals or make unsubstantiated claims. The Customer is responsible for the legality of offers and claims in its markets."] },
      { heading: "9. TERM & EXIT", body: ["Engagements run for an initial 12-month term, auto-renewing for 12-month periods. Either party may terminate for convenience with 60 days' notice. On exit KIKI delivers a data export and ceases Optimization within 5 business days."] },
      { heading: "10. LIABILITY & SLA", body: ["KIKI maintains a 99.9% control-plane SLA and cyber liability insurance. Beyond fees already earned, KIKI's liability is capped at the trailing 3 months of management fees. Nothing limits liability for confidentiality breach, data protection violations, or willful misconduct."] },
      { heading: "11. GOVERNING LAW", body: ["This Agreement is governed by the laws of England & Wales, without regard to conflict-of-law principles, with exclusive venue in the courts of England & Wales."] }
    ],
  },

  "reseller-partner": {
    title: "Reseller & Partner Agreement",
    version: "v2.1",
    effective: "February 15, 2026",
    sections: [
      { heading: "1. APPOINTMENT", body: ["KIKI appoints the Partner as a non-exclusive reseller of the Service in the approved territory, subject to this Agreement and the then-current Partner Program terms."] },
      { heading: "2. RESELLER OBLIGATIONS", body: ["The Partner shall market the Service professionally, complete KIKI certification, and provide first-line support to its end customers. The Partner shall not represent KIKI beyond authorized materials."] },
      { heading: "3. REVENUE SHARE", body: ["The Partner earns a recurring commission equal to 20% of net subscription revenue for the first 12 months and 15% thereafter, paid within 30 days of KIKI's receipt of customer payment. White-label margins are set in the Order Form."] },
      { heading: "4. WHITE-LABEL", body: ["With the white-label add-on, the Partner may present the Service under its own brand, subject to a visible \"Powered by KIKI\" attribution and retention of KIKI's legal and privacy notices."] },
      { heading: "5. CUSTOMER RELATIONSHIP", body: ["The Partner's customer contracts are with the Partner; KIKI contracts with the Partner. KIKI's Terms of Service and DPA flow down to end customers via the Partner."] },
      { heading: "6. TERM & TERMINATION", body: ["This Agreement is annual and auto-renews. Either party may terminate for material breach after a 30-day cure period. Accrued commissions remain payable for active customers."] },
      { heading: "7. COMPLIANCE & TRADEMARKS", body: ["The Partner complies with anti-corruption and export laws and uses KIKI trademarks per brand guidelines. KIKI may audit Partner compliance annually."] }
    ],
  },

  "enterprise-order": {
    title: "Enterprise Order Form Template",
    version: "v1.0",
    effective: "March 1, 2026",
    sections: [
      { heading: "", body: ["This Enterprise Order Form (\"Order\") is entered into by Customer and KIKI Agent, a product of STOREGRILL INC LTD, and incorporates the Terms of Service, DPA, and (if applicable) the OaaS MSA."] },
      { heading: "1. SUBSCRIPTION", body: ["Plan: Enterprise. Seats: [N]. Included signals: unlimited. Included tokens: unlimited. Custom SLA: 99.99%."] },
      { heading: "2. FEES", body: ["Annual subscription: [AMOUNT] USD, billed annually in advance. Custom modules: [LIST]. Implementation fee: [AMOUNT], one-time."] },
      { heading: "3. TERM", body: ["Initial term: [12/24/36] months from the Effective Date. Auto-renew for successive [12] month periods unless either party gives 60 days' notice."] },
      { heading: "4. SPECIAL TERMS", body: ["Data residency: [REGION]. White-label: [YES/NO]. Dedicated infrastructure: [YES/NO]. Custom SLA credits: per Schedule A."] },
      { heading: "5. SIGNATURES", body: ["Authorized signatures below bind the parties. Customer: ____________________  KIKI: ____________________  Date: ____________"] }
    ],
  },

  "agency-frame": {
    title: "Agency Frame Agreement",
    version: "v1.3",
    effective: "January 20, 2026",
    sections: [
      { heading: "1. PURPOSE", body: ["This Agency Frame Agreement allows the Agency to manage multiple end-client accounts (\"Client Accounts\") under a single master relationship with KIKI, with segregated tenants and consolidated billing."] },
      { heading: "2. STRUCTURE", body: ["Each Client Account is a separate KIKI tenant with isolated data. The Agency administers access; KIKI contracts with the Agency, which contracts with its clients."] },
      { heading: "3. WHITE-LABEL PORTAL", body: ["The Agency may offer clients a co-branded portal. Client-level branding, reports, and PDF exports carry the Agency's identity with \"Powered by KIKI\"."] },
      { heading: "4. BILLING", body: ["The Agency is billed centrally for all Client Accounts. The Agency may apply its own margin. Per-client caps and budgets are set in the portal."] },
      { heading: "5. COMPLIANCE", body: ["The Agency ensures each client's use complies with the Terms of Service and applicable law, and obtains necessary consents for KIKI Processing."] },
      { heading: "6. TERM", body: ["Annual, auto-renewing. The Agency may offboard a Client Account at any time; data export is available for 30 days after offboarding."] }
    ],
  },

  "soc2-type-ii": {
    title: "SOC 2 Type II Report — Summary",
    version: "FY2025",
    effective: "December 2025",
    sections: [
      { heading: "", body: ["The KIKI Agent SOC 2 Type II report is issued by an independent Big 4 accounting firm and covers the Security, Availability, and Confidentiality trust services criteria for the trailing 12-month period."] },
      { heading: "", body: ["Scope of the examination includes the KIKI control plane, the CAPI ingestion pipeline, the model-training and inference environment, and the wallet/virtual-card subsystem. The report contains the service auditor's description of controls and the results of tests of operating effectiveness."] },
      { heading: "", body: ["Key control areas: logical access (least privilege, MFA, just-in-time admin), change management (peer review, CI gating, immutable deploys), risk assessment (quarterly reviews), monitoring (24/7 detection, alerting), and incident response (documented runbooks, tabletop exercises)."] },
      { heading: "", body: ["The full report, including the auditor's opinion and detailed control narratives, is available under NDA. Request access via the Compliance Hub or email security@kiki.ai. A redacted bridge letter is provided between annual reports."] }
    ],
  },

  "subprocessor-list": {
    title: "Sub-Processor List",
    version: "2026.1",
    effective: "March 20, 2026",
    sections: [
      { heading: "", body: ["This is the complete list of sub-processors engaged by KIKI Agent, a product of STOREGRILL INC LTD, to process personal data on behalf of Customers, maintained per GDPR Article 28(2)."] },
      { heading: "", body: ["Microsoft Azure — Cloud infrastructure, compute, storage. Regions: EU (Frankfurt), US (Virginia), APAC (Singapore). Certifications: ISO 27001, SOC 2."] },
      { heading: "", body: ["Stripe — Payment processing and virtual card issuance. Regions: US, EU. Certifications: PCI DSS Level 1."] },
      { heading: "", body: ["OpenAI — AI model inference (GPT-4o). No customer data retained per DPA. Region: US. Certifications: SOC 2 Type II."] },
      { heading: "", body: ["Anthropic — AI model inference (Claude). No customer data retained per DPA. Region: US. Certifications: SOC 2 Type II."] },
      { heading: "", body: ["Google (Vertex AI) — AI model inference (Gemini). No customer data retained per DPA. Regions: US, EU. Certifications: ISO 27001, SOC 2."] },
      { heading: "", body: ["Meta (Llama) — On-premise LLaMA inference; data stays in KIKI infrastructure. Region: Azure VMs. Certifications: N/A (on-prem)."] },
      { heading: "", body: ["SendGrid — Transactional email delivery. Regions: US, EU. Certifications: SOC 2 Type II."] },
      { heading: "", body: ["DataDog — Infrastructure monitoring; no customer data. Region: EU. Certifications: SOC 2 Type II."] },
      { heading: "", body: ["PostHog — Privacy-preserving product analytics; self-hosted in EU. Certifications: SOC 2 Type II."] },
      { heading: "", body: ["Changes to this list are notified by email with at least 30 days' notice. To object to a new sub-processor or obtain the full DPA, email privacy@kiki.ai."] }
    ],
  },

  "penetration-test": {
    title: "Penetration Test Summary",
    version: "Q1 2026",
    effective: "February 28, 2026",
    sections: [
      { heading: "", body: ["A third-party offensive security firm performed a web application, API, and infrastructure penetration test against the production KIKI platform during Q1 2026."] },
      { heading: "", body: ["Methodology: authenticated and unauthenticated testing of the marketing site, dashboard, and REST/GraphQL APIs; business-logic abuse of the wallet and virtual-card flows; and cloud configuration review of the Azure tenant."] },
      { heading: "", body: ["Findings: 0 critical, 1 high (remediated within 72 hours — improper rate-limit on a public endpoint), 4 medium (all remediated within 14 days), 9 low/info. Retesting confirmed closure of all items."] },
      { heading: "", body: ["The detailed report, including exploit narratives and evidence, is available under NDA via security@kiki.ai. Remediation status is tracked to closure in the issue tracker and reviewed by the security committee."] }
    ],
  },

  "ropa": {
    title: "GDPR Article 30 Records of Processing Activities (Template)",
    version: "v1.0",
    effective: "January 10, 2026",
    sections: [
      { heading: "", body: ["This template helps Customers complete their own Article 30 RoPA when using KIKI as a processor. As controller, the Customer is responsible for maintaining its records."] },
      { heading: "1. PURPOSES: marketing optimization, LTV prediction, audience building, fraud and invalid-traffic detection, and billing", body: [] },
      { heading: "2. CATEGORIES OF DATA SUBJECTS: customers, website visitors, and leads of the Controller", body: [] },
      { heading: "3. CATEGORIES OF PERSONAL DATA: contact data, hashed identifiers, conversion events, device/attribution metadata, derived LTV and segment scores", body: [] },
      { heading: "4. SPECIAL CATEGORY DATA: none processed by KIKI by default", body: ["Customers must not send special-category data through the CAPI pipeline."] },
      { heading: "5. RECIPIENTS: the Processor (KIKI) and its Sub-processors (see Sub-Processor List)", body: [] },
      { heading: "6. TRANSFERS: international transfers under Standard Contractual Clauses as described in the DPA", body: [] },
      { heading: "7. RETENTION: per the Controller's configured window (default 24 months); deleted on termination", body: [] },
      { heading: "8. SECURITY: see the DPA Annex I and Security Whitepaper", body: [] }
    ],
  },

  "api-reference": {
    title: "API Reference",
    version: "v2.4",
    effective: "March 20, 2026",
    sections: [
      { heading: "", body: ["The KIKI REST API (OpenAPI 3.1) lets you ingest signals, read LTV predictions, manage campaigns, and issue virtual cards programmatically."] },
      { heading: "", body: ["Authentication: Bearer tokens issued from the dashboard under Settings > API Keys. Tokens are scoped per tenant and may be restricted to specific endpoints."] },
      { heading: "", body: ["Core resources: /v1/signals (CAPI ingestion), /v1/ltv (predictions), /v1/campaigns (read/optimize), /v1/wallet (cards & balance), /v1/billing (invoices & usage)."] },
      { heading: "", body: ["Rate limits: 600 requests/minute per tenant for ingestion, 120/minute for read endpoints. Exceeding limits returns HTTP 429 with a Retry-After header."] },
      { heading: "", body: ["The full interactive specification, SDKs, and runnable examples are available at kiki.ai/docs/api. Webhooks stream signal, anomaly, and billing events to your endpoint over signed HTTPS."] }
    ],
  },

  "sdk-guide": {
    title: "SDK Integration Guide",
    version: "v2.4",
    effective: "March 15, 2026",
    sections: [
      { heading: "", body: ["Official KIKI SDKs wrap the REST API with typed clients and automatic retry/backoff. Languages: JavaScript/TypeScript, Python, Go, and PHP."] },
      { heading: "", body: ["Install: npm i @kiki/sdk (JS), pip install kiki (Python), go get github.com/kiki-agent/sdk-go, composer require kiki/sdk (PHP)."] },
      { heading: "", body: ["Quickstart: initialize the client with your API key, then call kiki.signals.send(event) to ingest a conversion, and kiki.ltv.predict(userId) to fetch a score."] },
      { heading: "", body: ["Best practices: batch signals (up to 500/request), idempotify events with an event_id, and verify webhook signatures using your signing secret. See kiki.ai/docs/sdk for full recipes."] }
    ],
  },

  "capi-setup": {
    title: "CAPI Setup Walkthrough",
    version: "v2.3",
    effective: "March 10, 2026",
    sections: [
      { heading: "", body: ["The KIKI CAPI pipeline unifies conversion signals from 14 ad platforms into a single LTV-optimized event stream. This walkthrough covers setup in 6 steps."] },
      { heading: "1. Connect sources: authorize Meta, Google, TikTok, LinkedIn, Pinterest, Snap, and 8 more from the dashboard Integrations page", body: ["OAuth tokens are encrypted at rest."] },
      { heading: "2. Map events: match your conversion events (Purchase, Lead, Signup) to KIKI event types", body: ["Hashed emails/phones are sent for identity resolution."] },
      { heading: "3. Deploy the snippet: add the KIKI tag to your site or forward server-side events to /v1/signals", body: ["Validate delivery in the Live Signals viewer."] },
      { heading: "4. Train the model: LTV predictions become available after ~1,000 events", body: ["Monitor calibration in the Model tab."] },
      { heading: "5. Activate agents: enable Acquisition, Retention, Creative, Audience, Bidding, and Insight agents per campaign", body: [] },
      { heading: "6. Verify: confirm ROAS and CAC dashboards populate", body: ["See kiki.ai/docs/capi for platform-specific notes and troubleshooting."] }
    ],
  },

  "security-whitepaper": {
    title: "Security Architecture Whitepaper",
    version: "v1.0",
    effective: "February 1, 2026",
    sections: [
      { heading: "", body: ["KIKI's security architecture follows a zero-trust model: no implicit trust, explicit verification for every request, and least-privilege by default."] },
      { heading: "", body: ["Identity: customers authenticate via email/MFA; service-to-service calls use short-lived mTLS certificates rotated hourly. Admin access is just-in-time and fully logged."] },
      { heading: "", body: ["Network: VNet isolation, private endpoints for data stores, WAF at the edge, and egress filtering. The model-training environment is network-isolated from production data stores."] },
      { heading: "", body: ["Data protection: TLS 1.2+ in transit, AES-256 at rest, field-level encryption for payment and identity tokens. Keys are managed in a hardware-backed key vault with split administration."] },
      { heading: "", body: ["AI supply chain: third-party model sub-processors operate under zero-retention DPAs; on-premise LLaMA keeps data inside KIKI infrastructure. Prompts and customer data are never used to train foundational models."] },
      { heading: "", body: ["Operations: continuous monitoring, automated vulnerability scanning, annual third-party pen tests, and an incident-response plan with a 72-hour breach notification commitment. See the SOC 2 report and Pen Test Summary for evidence."] }
    ],
  },
};

export function getContract(slug: string): ContractDoc | undefined {
  return CONTRACTS[slug];
}

// Map the Compliance Hub doc names to contract slugs.
export const DOC_SLUGS: Record<string, string> = {
  "Terms of Service v2.4": "terms-of-service",
  "Privacy Policy 2026.1": "privacy-policy",
  "Data Processing Addendum v3.1": "data-processing-addendum",
  "Mutual NDA v1.2": "mutual-nda",
  "OaaS Master Services Agreement v1.0": "oaas-msa",
  "Reseller / Partner Agreement v2.1": "reseller-partner",
  "Enterprise Order Form Template": "enterprise-order",
  "Agency Frame Agreement v1.3": "agency-frame",
  "SOC 2 Type II Report": "soc2-type-ii",
  "Sub-Processor List": "subprocessor-list",
  "Penetration Test Summary 2026": "penetration-test",
  "GDPR Article 30 RoPA Template": "ropa",
  "API Reference v2.4": "api-reference",
  "SDK Integration Guide": "sdk-guide",
  "CAPI Setup Walkthrough": "capi-setup",
  "Security Architecture Whitepaper": "security-whitepaper",
};
