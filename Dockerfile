# ── Base ──────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# better-sqlite3 needs its install script (prebuilt binary fetch).
# --include=dev is required: NODE_ENV=production would otherwise skip
# tailwindcss/typescript needed by `next build`.
RUN npm install --ignore-scripts=false --engine-strict=false --include=dev

# ── Builder ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . /app
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must
# be set here (not just as Container App runtime env vars). Override per env via
# `az acr build --build-arg NEXT_PUBLIC_SITE_URL=...` if mapping a custom domain.
ARG NEXT_PUBLIC_API_URL="https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io"
ARG NEXT_PUBLIC_SITE_URL="https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io"
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
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "server.js"]
