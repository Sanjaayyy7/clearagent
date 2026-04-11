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

RUN npm ci --workspace=packages/dashboard --include-workspace-root

# ─── Stage 2: builder ────────────────────────────────────────
FROM deps AS builder

ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY tsconfig.base.json ./
COPY packages/dashboard ./packages/dashboard/

RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/dashboard

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/dashboard/dist ./packages/dashboard/dist
COPY --from=builder /app/packages/dashboard/server.cjs ./packages/dashboard/server.cjs
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/dashboard/package.json ./packages/dashboard/

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/v1/health" || exit 1

CMD ["node", "packages/dashboard/server.cjs"]
