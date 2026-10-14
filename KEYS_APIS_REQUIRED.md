# Keys & APIs Required (Storegrill_Azure / kiki-agent-rg)

Current live infra: Azure OpenAI, PostgreSQL, Container App, ACR.

## 1) Core
- DATABASE_URL: postgresql://<user>:<pass>@kiki-pg-chrdtvff.postgres.database.azure.com:5432/kiki?sslmode=require
- JWT_SECRET: random 32+ char
- ENCRYPTION_KEY: 32-byte hex

## 2) Azure OpenAI
- AZURE_OPENAI_ENDPOINT: https://kikiopenaichrdtvff.openai.azure.com/
- AZURE_OPENAI_API_KEY: from Azure Portal
- AZURE_OPENAI_API_VERSION: 2024-10-21
- AZURE_OPENAI_DEPLOYMENT_MINI: <deployment name>
- AZURE_OPENAI_DEPLOYMENT_STANDARD: <deployment name>

Check deployments:
az cognitiveservices account deployment list -n kikiopenaichrdtvff -g kiki-agent-rg --query \"[].name\"

## 3) Groq (Recommended)
- GROQ_API_KEY: from console.groq.com/keys
- GROQ_MODEL: openai/gpt-oss-20b

## 4) Stripe (Billing)
- STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_STARTER

## 5) Ad Platform Connectors (optional)
- META_ACCESS_TOKEN, GOOGLE_ADS_REFRESH_TOKEN, TIKTOK_ACCESS_TOKEN, SNAP_ACCESS_TOKEN, PINTEREST_ACCESS_TOKEN, LINKEDIN_ACCESS_TOKEN
- AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET

## 6) External Microservices (optional)
- CREATIVE_ATTRIBUTION_URL, MMM_URL, COMPETITIVE_INTEL_URL, PROFIT_MARGIN_URL, NL_ANALYTICS_URL, INFLUENCER_URL

## 7) Messaging/Email (optional)
- KAFKA_BROKERS, SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/EMAIL_FROM

## 8) Flags
- NEXT_PUBLIC_DEMO_MODE: false
- SEED_DEMO_DATA: false
