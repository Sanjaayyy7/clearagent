# syntax=docker/dockerfile:1

# ─── Stage 1: base ───────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

# ─── Stage 2: deps ───────────────────────────────────────────
FROM base AS deps
# Copy workspace package files (root + api package only)
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/dashboard/package.json ./packages/dashboard/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/landing/package.json ./packages/landing/
RUN npm ci --workspace=packages/api --include-workspace-root

# ─── Stage 3: builder ────────────────────────────────────────
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/api/src ./packages/api/src
COPY packages/api/tsconfig.json ./packages/api/
RUN npm run build --workspace=packages/api

# ─── Stage 4: runner ─────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY package.json ./
COPY packages/api/package.json ./packages/api/

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/v1/health || exit 1

CMD ["dumb-init", "node", "packages/api/dist/index.js"]
