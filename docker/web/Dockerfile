# MonokerOS Web — Next.js 15 on Bun
FROM oven/bun:1.3.8 AS deps

WORKDIR /app

# Copy lockfile and workspace package manifests first (layer cache)
COPY bun.lock package.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/constants/package.json packages/constants/
COPY packages/utils/package.json packages/utils/
COPY packages/ui/package.json packages/ui/
COPY packages/renderer/package.json packages/renderer/
COPY packages/templates/package.json packages/templates/
COPY packages/config/package.json packages/config/

RUN bun install --frozen-lockfile 2>/dev/null || bun install

# ── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1.3.8 AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ apps/web/
COPY packages/ packages/
COPY tsconfig.json ./
COPY package.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN cd apps/web && bunx next build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM oven/bun:1.3.8

WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static apps/web/.next/static
COPY --from=builder /app/apps/web/public apps/web/public

EXPOSE 3000

USER bun

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["bun", "apps/web/server.js"]
