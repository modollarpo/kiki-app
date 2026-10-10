# ── Base ──────────────────────────────────────────────────
# Node 24 ships the `node:sqlite` built-in (used by the SQLite persistence
# fallback when DATABASE_URL is unset). Node 20 does NOT have node:sqlite, which
# silently forced an in-memory DB and wiped all accounts on every restart.
FROM node:24-bookworm-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# better-sqlite3 needs its install script (prebuilt binary fetch).
# --include=dev is required: NODE_ENV=production would otherwise skip
# tailwindcss/typescript needed by `next build`.
# PUPPETEER_SKIP_DOWNLOAD avoids Chrome download in slim image (PDFs use Edge headless on host).
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --ignore-scripts=false --engine-strict=false --include=dev

# ── Builder ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . /app
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must
# be set here (not just as Container App runtime env vars). Override per env via
# `az acr build --build-arg NEXT_PUBLIC_API_URL=https://<app>.<region>.azurecontainerapps.io --build-arg NEXT_PUBLIC_SITE_URL=https://<app>.<region>.azurecontainerapps.io`
# Default to empty so the browser calls the SAME origin it was served from
# (relative /api/... requests). Baking a hostname here means a stale/incorrect
# value (e.g. localhost:3000) causes browser "NetworkError" on every API call.
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# Allow build even if strict type/lint errors exist in the project
ENV NEXT_TELEMETRY_DISABLED=1
# Filter non-ASCII (e.g. Next.js U+25B2 banner) so ACR log streaming doesn't crash on cp1252 clients.
RUN /bin/bash -c "set -o pipefail; npm run build 2>&1 | tr -cd '[:print:]\t\n\r'"

# ── Runner ────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Standalone output: minimal server + required node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "server.js"]
