FROM node:20-alpine AS deps
WORKDIR /app
# Native deps for argon2/sharp and Prisma engines on Alpine
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm i --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl ca-certificates clamav \
  && sed -i '/^Example/d' /etc/clamav/freshclam.conf \
  && freshclam
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
