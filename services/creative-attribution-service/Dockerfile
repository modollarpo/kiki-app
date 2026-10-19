FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=@kiki/shared 2>/dev/null || true

FROM base AS build
COPY packages/shared/ ./packages/shared/
COPY services/creative-attribution-service/ ./services/creative-attribution-service/
RUN cd packages/shared && npm run build 2>/dev/null || true
RUN cd services/creative-attribution-service && npm install && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /app/services/creative-attribution-service/dist ./services/creative-attribution-service/dist
COPY --from=build --chown=node:node /app/services/creative-attribution-service/package.json ./services/creative-attribution-service/
ENV NODE_ENV=production
USER node
EXPOSE 3021
CMD ["node", "services/creative-attribution-service/dist/index.js"]
