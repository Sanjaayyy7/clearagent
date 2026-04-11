# syntax=docker/dockerfile:1
# Universal multi-service Dockerfile.
# Builds ALL packages unconditionally — no SERVICE build variable required.
# Railway start command per service selects which package to run:
#   api:        npm start --workspace=packages/api
#   dashboard:  npm start --workspace=packages/dashboard
#   landing:    npm start --workspace=packages/landing
#   mcp-server: npm start --workspace=packages/mcp-server
#   sdk:        npm start --workspace=packages/sdk

ARG SERVICE=api
ARG VITE_API_URL=""

# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api/package.json         ./packages/api/
COPY packages/dashboard/package.json   ./packages/dashboard/
COPY packages/sdk/package.json         ./packages/sdk/
COPY packages/mcp-server/package.json  ./packages/mcp-server/
COPY packages/landing/package.json     ./packages/landing/

RUN NODE_OPTIONS="--max-old-space-size=1536" npm ci --include-workspace-root

# ─── Stage 2: builder ────────────────────────────────────────
FROM deps AS builder
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY tsconfig.base.json ./
COPY packages/ ./packages/

# Build TypeScript packages (fast)
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/api
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/mcp-server
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/sdk

# Build Vite frontends (memory-intensive — run sequentially)
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/dashboard
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/landing

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

ARG SERVICE=api
ENV SERVICE=$SERVICE

COPY --from=builder /app/packages ./packages
COPY --from=deps    /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/v1/health" || exit 1

CMD ["sh", "-c", "dumb-init npm start --workspace=packages/${SERVICE}"]
