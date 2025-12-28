# ---------- deps ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Print logs so Railway doesn't think it's stuck + add cache for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
  npm config set registry https://registry.npmjs.org/ \
  && npm config set fetch-timeout 300000 \
  && npm config set fetch-retries 8 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 180000 \
  && npm config set loglevel info \
  && npm ci --no-audit --no-fund


# ---------- builder ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Optional: shrink runtime deps
RUN npm prune --omit=dev


# ---------- runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
