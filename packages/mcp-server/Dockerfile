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

RUN npm ci --workspace=packages/mcp-server --include-workspace-root

# ─── Stage 2: builder ────────────────────────────────────────
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/mcp-server ./packages/mcp-server/

RUN npm run build --workspace=packages/mcp-server

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/mcp-server/package.json ./packages/mcp-server/

EXPOSE 3001

CMD ["dumb-init", "node", "packages/mcp-server/dist/index.js"]
