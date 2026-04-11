# syntax=docker/dockerfile:1
# Universal Dockerfile used by ALL Railway services.
# Railway has this path hardcoded for every service.
# Builds all 5 packages so each service's start command finds what it needs.

ARG VITE_API_URL=""

# ─── Stage 1: base ───────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

# ─── Stage 2: deps ───────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/api/package.json         ./packages/api/
COPY packages/dashboard/package.json   ./packages/dashboard/
COPY packages/sdk/package.json         ./packages/sdk/
COPY packages/mcp-server/package.json  ./packages/mcp-server/
COPY packages/landing/package.json     ./packages/landing/
RUN NODE_OPTIONS="--max-old-space-size=1536" npm ci --include-workspace-root

# ─── Stage 3: builder ────────────────────────────────────────
FROM deps AS builder
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY tsconfig.base.json ./
COPY packages/ ./packages/

# TypeScript packages (fast)
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/api
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/mcp-server
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/sdk

# Vite frontends (memory-intensive — sequential)
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/dashboard
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/landing

# ─── Stage 4: runner ─────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/packages ./packages
COPY --from=deps    /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/v1/health" || exit 1

# Default: run API. Railway's custom start command per service overrides this.
CMD ["dumb-init", "node", "packages/api/dist/index.js"]
