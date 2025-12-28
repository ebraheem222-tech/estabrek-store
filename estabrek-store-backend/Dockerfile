# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  ca-certificates \
  python3 \
  make \
  g++

COPY package.json package-lock.json ./

RUN npm config set registry https://registry.npmjs.org/ \
 && npm config set fetch-timeout 300000 \
 && npm config set fetch-retries 8 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 180000 \
 && npm config set progress false \
 && npm ci --no-audit --no-fund


# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build


# ---------- runtime ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat openssl ca-certificates

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
