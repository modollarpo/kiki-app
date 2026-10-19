FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=@kiki/shared 2>/dev/null || true

FROM base AS build
COPY packages/shared/ ./packages/shared/
COPY services/influencer-service/ ./services/influencer-service/
RUN cd packages/shared && npm run build 2>/dev/null || true
RUN cd services/influencer-service && npm install && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /app/services/influencer-service/dist ./services/influencer-service/dist
COPY --from=build --chown=node:node /app/services/influencer-service/package.json ./services/influencer-service/
ENV NODE_ENV=production
USER node
EXPOSE 3026
CMD ["node", "services/influencer-service/dist/index.js"]
