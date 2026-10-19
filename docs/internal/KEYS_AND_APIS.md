# Keys, APIs, and External Services Needed

This document lists required and optional external credentials to run KIKI Agent Platform end-to-end in production/dev with real data.

## Environment File
Active: .env.local (not committed). See .env.example and .env.template for full template.

## Core (Required for basic auth/app)

| Variable | Required | Notes |
|---|---|---|
| DATABASE_URL | Yes | PostgreSQL (Neon/Azure Postgres). SQLite fallback exists (etter-sqlite3) if unavailable. |
| JWT_SECRET | Yes | For custom JWT auth. |
| ENCRYPTION_KEY | Yes | Used for sensitive fields. |

## AI Services

| Variable | Required | Notes |
|---|---|---|
| AZURE_OPENAI_ENDPOINT | Yes | e.g. https://<res>.openai.azure.com/ |
| AZURE_OPENAI_API_KEY | Yes | Azure OpenAI key. |
| AZURE_OPENAI_API_VERSION | Yes | e.g. 2024-10-21 |
| AZURE_OPENAI_DEPLOYMENT_MINI | Yes | Mini tier. |
| AZURE_OPENAI_DEPLOYMENT_STANDARD | Yes | Standard tier. |
| GROQ_API_KEY | Recommended | Fast bidding (falls back to Azure mini if missing). |
| GROQ_MODEL | Optional | Default openai/gpt-oss-20b. |
| OPENCODE_ENDPOINT | Optional | Headless agent backend (e.g. http://localhost:8080). |
| OPENCODE_SECRET | Optional | Auth for OpenCode endpoint. |


## Azure Production Resources (Confirmed)

Connected to subscription 'Azure subscription 1' (Default Directory). Resources in 'sewa-ai-prod-rg' (swedencentral):

| Resource | Type | Details |
|---|---|---|
| sewa-ai-prod-eu-openai | Azure OpenAI | Endpoint: https://sewa-ai-prod-eu-openai-abb49.openai.azure.com/ |
| sewa-ai-prod-eu-pg | PostgreSQL Flexible Server | FQDN: sewa-ai-prod-eu-pg.postgres.database.azure.com, v15, Ready |
| sewa-ai-prod-eu-kv | Key Vault | Vault URI: https://sewa-ai-prod-eu-kv.vault.azure.net/ |
| sewa-ai-prod-eu-aks | AKS | K8s 1.35.6, FQDN: sewa-ai-prod-eu-w228to3a.hcp.swedencentral.azmk8s.io |
| sewaaieuprodacr | ACR | Container registry |
| sewa-ai-prod-eu-appinsights | App Insights | Monitoring |
| sewa-ai-prod-eu-law | Log Analytics | Central logs |



## Azure (Correct Subscription: Storegrill_Azure)
Subscription: Storegrill_Azure. RG: kiki-agent-rg (swedencentral).
Resources: kikiopenaichrdtvff (OpenAI), kiki-pg-chrdtvff (Postgres v16), kiki-app (Container App with keekii.net), kikiagentacrchrdtvff (ACR), kiki-logs.
