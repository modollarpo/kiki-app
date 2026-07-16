FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=@kiki/shared 2>/dev/null || true

FROM base AS build
COPY packages/shared/ ./packages/shared/
COPY services/mmm-service/ ./services/mmm-service/
RUN cd packages/shared && npm run build 2>/dev/null || true
RUN cd services/mmm-service && npm install && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/mmm-service/dist ./services/mmm-service/dist
COPY --from=build /app/services/mmm-service/package.json ./services/mmm-service/
ENV NODE_ENV=production
EXPOSE 3022
CMD ["node", "services/mmm-service/dist/index.js"]
