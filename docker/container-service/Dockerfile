# MonokerOS Container Service — manages agent Docker containers
# Minimal Bun image, copies only the service source.

FROM oven/bun:1-slim

WORKDIR /app

# Copy service package manifest and install deps (if any)
COPY services/container-service/package.json ./
RUN bun install --frozen-lockfile 2>/dev/null || true

# Copy service source
COPY services/container-service/src ./src

# Default port
ENV PORT=3002
EXPOSE 3002

CMD ["bun", "src/index.ts"]
