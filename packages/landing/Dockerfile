# syntax=docker/dockerfile:1

# ─── Stage 1: build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/dashboard/package.json ./packages/dashboard/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/landing/package.json ./packages/landing/

RUN npm ci --workspace=packages/landing --include-workspace-root

# Copy source and build
COPY packages/landing ./packages/landing/
COPY tsconfig.base.json ./

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build --workspace=packages/landing

# ─── Stage 2: serve ──────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/packages/landing/dist /usr/share/nginx/html

RUN printf 'server {\n  listen 80;\n  location / {\n    root /usr/share/nginx/html;\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
