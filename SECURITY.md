# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately by emailing **security@kiki.ai** with:

- A description of the issue and its impact
- Steps to reproduce (proof-of-concept if possible)
- Affected endpoint/component and version/commit
- Any suggested remediation

We aim to acknowledge reports within **2 business days** and to provide a
remediation timeline after triage. Please give us a reasonable window to fix
the issue before any public disclosure.

## Scope

In scope: the KIKI Agent web application, REST APIs, microservices and the
mobile API under this repository.

Out of scope: third-party platforms (Meta, Google, TikTok, Snap, Pinterest,
LinkedIn, Stripe, Slack, Shopify, WooCommerce), volumetric/DoS testing, and
social engineering.

## Secret Hygiene

- Never commit `.env.local`, credentials or API keys. Real secrets belong in
  Azure Key Vault / Container App secrets.
- `JWT_SECRET`, `SERVICE_JWT_SECRET`, `ENCRYPTION_KEY` and platform tokens must
  be set via environment variables. In production the app refuses to start
  authenticated flows without a sufficiently strong `JWT_SECRET`.
- `.env.example` / `.env.template` document required variables and must contain
  placeholders only.
