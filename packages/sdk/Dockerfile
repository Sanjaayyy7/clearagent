# syntax=docker/dockerfile:1

# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/dashboard/package.json ./packages/dashboard/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/landing/package.json ./packages/landing/

RUN npm ci --workspace=packages/sdk --include-workspace-root

# ─── Stage 2: builder ────────────────────────────────────────
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/sdk ./packages/sdk/

RUN npm run build --workspace=packages/sdk

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY packages/sdk/health.cjs ./packages/sdk/health.cjs
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/sdk/package.json ./packages/sdk/

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/v1/health" || exit 1

CMD ["node", "packages/sdk/health.cjs"]
