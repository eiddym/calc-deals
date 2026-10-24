# Stage 1: Base
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# User no-root por seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos compilados en modo standalone
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
