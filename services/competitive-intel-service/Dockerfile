FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=@kiki/shared 2>/dev/null || true

FROM base AS build
COPY packages/shared/ ./packages/shared/
COPY services/competitive-intel-service/ ./services/competitive-intel-service/
RUN cd packages/shared && npm run build 2>/dev/null || true
RUN cd services/competitive-intel-service && npm install && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/competitive-intel-service/dist ./services/competitive-intel-service/dist
COPY --from=build /app/services/competitive-intel-service/package.json ./services/competitive-intel-service/
ENV NODE_ENV=production
EXPOSE 3023
CMD ["node", "services/competitive-intel-service/dist/index.js"]
