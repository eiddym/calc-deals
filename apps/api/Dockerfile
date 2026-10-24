# Stage 1: Base
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
