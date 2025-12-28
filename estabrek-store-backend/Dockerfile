# ---------- deps ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Avoid IPv6 weirdness sometimes seen in CI
ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Keep output flowing so Railway doesn't time out
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
  bash -lc '\
    npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 8 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 180000 && \
    (npm ci --no-audit --no-fund --progress=true & pid=$!; \
      while kill -0 $pid 2>/dev/null; do echo "npm ci still running..."; sleep 20; done; \
      wait $pid ) \
  '


# ---------- builder ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev


# ---------- runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
