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

