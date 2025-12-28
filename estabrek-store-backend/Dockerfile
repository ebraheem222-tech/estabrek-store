# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Native deps for argon2/sharp and Prisma engines on Alpine
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++

# Copy lockfiles
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Force public npm registry + increase retries to avoid CI/Railway timeouts
RUN npm config set registry https://registry.npmjs.org/ \
 && npm config delete proxy || true \
 && npm config delete https-proxy || true \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci --no-audit --no-fund


# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client
RUN npx prisma generate

# Build
RUN npm run build


# ---------- runtime ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Runtime deps + ClamAV (as you had it)
RUN apk add --no-cache libc6-compat openssl ca-certificates clamav \
  && sed -i '/^Example/d' /etc/clamav/freshclam.conf \
  && freshclam

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
