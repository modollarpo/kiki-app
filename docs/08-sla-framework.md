# KIKI Agent™ — Service Level Agreement Framework

**A STOREGRILL INC LTD Company** — Registered in England & Wales

---

**Document:** SLA Framework & Uptime Guarantee  
**Applicable to:** Enterprise and Scale plan customers (Growth plan: 99.5% best-effort)  
**Effective:** From commercial launch (Q3 2026)

---

## 1. Service Commitments

### 1.1 Uptime Guarantees

| Component | Scale Plan | Enterprise Plan |
|-----------|-----------|----------------|
| Platform Dashboard & API | 99.9% uptime (monthly) | 99.95% uptime (monthly) |
| CAPI Event Ingestion | 99.9% delivery rate | 99.95% delivery rate |
| LTV Prediction Engine | 99.9% availability | 99.95% availability |
| Fraud Detection Scoring | 99.5% availability | 99.9% availability |
| SyncBrain AI Chat | 99.5% availability | 99.9% availability |

### 1.2 Performance Guarantees

| Metric | p50 | p99 | Measurement Period |
|--------|-----|-----|-------------------|
| LTV Prediction Latency | 38ms | 95ms | Monthly rolling |
| CAPI Delivery (Meta) | 341ms | 500ms | Monthly rolling |
| CAPI Delivery (All platforms) | 400ms | 700ms | Monthly rolling |
| API Response Time | 45ms | 200ms | Monthly rolling |
| Dashboard Page Load | 1.2s | 4s | Monthly rolling |

### 1.3 Financial Remedies

If uptime falls below the committed percentage in any calendar month, the customer receives a Service Credit:

| Uptime | Credit (% of monthly fee) |
|--------|--------------------------|
| 99.5% – 99.9% (Scale) / 99.9% – 99.95% (Enterprise) | 0% (within SLA) |
| 99.0% – 99.49% (Scale) / 99.5% – 99.89% (Enterprise) | 10% credit |
| 98.0% – 98.99% (Scale) / 99.0% – 99.49% (Enterprise) | 25% credit |
| 95.0% – 97.99% (Scale) / 98.0% – 98.99% (Enterprise) | 50% credit |
| Below 95% / Below 98% | 100% credit + termination right |

**Maximum aggregate credit:** 100% of one month's fee per rolling 12-month period.  
**Credit request:** Must be submitted within 30 days of the incident month.

---

## 2. Support Response Times

### 2.1 Severity Definitions

| Severity | Definition | Examples |
|----------|-----------|---------|
| **Critical (P1)** | Platform unavailable. CAPI events not being delivered. LTV predictions failing for all customers. | Dashboard 500 errors, Kafka cluster down, database unreachable |
| **High (P2)** | Major feature unavailable. Single customer's events not processing. SyncBrain not responding. | Single platform connector down, fraud engine timeout, SSO failure |
| **Normal (P3)** | Non-critical feature issue. Minor UI bug. Documentation error. | Dashboard filter not working, export formatting issue, typo in docs |
| **Low (P4)** | Cosmetic issue. Feature request. General enquiry. | Colour mismatch, new platform request, pricing question |

### 2.2 Response & Resolution Targets

| Severity | Initial Response | Update Frequency | Target Resolution |
|----------|-----------------|-----------------|-------------------|
| **P1 — Critical** | 1 hour (Enterprise) / 2 hours (Scale) | Every 2 hours | 4 hours (Enterprise) / 8 hours (Scale) |
| **P2 — High** | 2 hours (Enterprise) / 4 hours (Scale) | Every 4 hours | 8 hours (Enterprise) / 24 hours (Scale) |
| **P3 — Normal** | 8 business hours | Daily | 5 business days |
| **P4 — Low** | 24 business hours | Weekly | Next release or planned |

### 2.3 Support Channels

| Plan | Channels | Hours | Target First Response |
|------|----------|-------|---------------------|
| Growth | Email only | UK business hours (09:00–18:00, Mon–Fri) | 48 hours |
| Scale | Email + In-app chat | Extended hours (08:00–20:00, Mon–Fri) | 8 hours |
| Enterprise | Email + Chat + Phone + Dedicated Slack | 24/7/365 | 1 hour (P1) / 2 hours (P2) |

---

## 3. Data Processing & Security

### 3.1 Data Residency

| Data Type | Location | Notes |
|-----------|----------|-------|
| Customer Conversion Data | Azure UK South (London) | Primary processing region |
| Enriched Signals (in transit) | Encrypted TLS 1.3 | End-to-end to platform endpoints |
| Dashboard & API Traffic | Azure West Europe (Amsterdam) | CDN-cached where appropriate |
| Backups | Azure UK South (geo-redundant) | Daily snapshots, 30-day retention |
| AI Model Training Data | Azure UK South | Anonymised, never leaves UK |

### 3.2 Data Protection

- **Encryption at rest:** AES-256 (Azure Storage Service Encryption)
- **Encryption in transit:** TLS 1.3 minimum (all API endpoints, dashboard, CAPI webhooks)
- **Access control:** Role-based access control (RBAC) — Admin, Operator, Viewer roles
- **Audit logging:** All access to customer data logged and retained for 12 months
- **Data Processing Agreement (DPA):** Available on request, executed before data processing begins
- **Sub-processors:** Azure (infrastructure), Stripe (payments), Groq (AI inference), OpenAI (AI inference) — full list in Privacy Policy

### 3.3 Backups & Disaster Recovery

| Component | Backup Frequency | Recovery Time Objective (RTO) | Recovery Point Objective (RPO) |
|-----------|-----------------|------------------------------|-------------------------------|
| PostgreSQL Database | Every 6 hours | 1 hour | 6 hours |
| File Storage (Azure Files) | Daily | 30 minutes | 24 hours |
| Kafka Event Logs | Real-time replication | 15 minutes | Near-zero |
| Application State | Immutable container images | 10 minutes | Image-based |

**DR testing:** Conducted quarterly. Customer notification 7 days in advance of scheduled tests.

---

## 4. Incident Management

### 4.1 Incident Classification

| Type | Description | Example |
|------|-------------|---------|
| **Security Incident** | Unauthorised access, data breach, credential compromise | AWS key leaked, customer data accessed without authorisation |
| **Availability Incident** | Service degradation or outage | Azure region failure, database connection pool exhaustion |
| **Performance Incident** | Latency exceeding p99 SLAs | LTV prediction spiking above 200ms |
| **Data Loss Incident** | Customer data lost or corrupted | Accidental database truncation, backup failure |

### 4.2 Incident Response Process

1. **Detection** — Automated monitoring (Datadog) or customer report
2. **Triage** — On-call engineer assesses severity (10 minutes)
3. **Containment** — Isolate affected systems, reroute traffic if possible
4. **Resolution** — Fix root cause, verify fix, deploy
5. **Post-Mortem** — Within 48 hours of resolution (Enterprise) / 5 business days (Scale)

### 4.3 Breach Notification

Under UK GDPR Article 33, KIKI Agent will notify the ICO of any personal data breach within 72 hours of becoming aware. Affected customers will be notified within 24 hours of breach confirmation.

---

## 5. Maintenance Windows

| Type | Frequency | Notice Period | Downtime Expected | Timing |
|------|-----------|--------------|-------------------|--------|
| Routine Platform Updates | Weekly | 48 hours | 0 minutes (rolling deploy) | Tue/Thu 02:00–04:00 UK |
| Database Maintenance | Quarterly | 7 days | <15 minutes | Weekend 03:00 UK |
| Infrastructure Upgrade | Bi-annual | 14 days | <30 minutes | Weekend 02:00–04:00 UK |
| Emergency Security Patch | As needed | As soon as possible | Minimised | Immediate |

**Note:** KIKI uses Azure Container Apps with rolling deployments. Most updates involve zero downtime. Any scheduled downtime exceeding 5 minutes will be communicated 48 hours in advance for Scale plans and 7 days in advance for Enterprise.

---

## 6. Scope & Exclusions

The SLA does not apply to:

1. Downtime caused by customer-side issues (misconfiguration, expired credentials, network issues at customer site)
2. Scheduled maintenance (with proper notice)
3. Force majeure events (Azure region-level outage beyond KIKI's control, natural disasters, war, terrorism)
4. Third-party platform API downtime (if Meta CAPI or Google Ads API is down, KIKI's delivery SLA may be affected)
5. Beta or early-access features explicitly marked as "preview" or "experimental"
6. Free trials, pilots, or non-paying accounts

---

## 7. Reporting & Verification

- **Monthly SLA reports:** Published within 5 business days of month-end
- **Real-time status page:** https://status.kiki.ai
- **Verification:** Customers may request third-party monitoring data (Datadog) under NDA
- **Dispute resolution:** Any SLA credit dispute escalated per Founders' Agreement dispute clause (mediation → arbitration)

---

*This SLA framework applies to paid Scale and Enterprise subscriptions. Growth plan customers receive best-effort support with 99.5% target uptime (no financial remedies).*

*KIKI Agent™ — A STOREGRILL INC LTD Company. Registered in England & Wales.*
