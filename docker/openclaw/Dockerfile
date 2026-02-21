# OpenClaw gateway with Chromium and MonokerOS MCP server
FROM node:22-bookworm AS base

# Install Chromium and Xvfb for browser-based tools
ARG INSTALL_BROWSER=true
RUN if [ "$INSTALL_BROWSER" = "true" ]; then \
      apt-get update && apt-get install -y --no-install-recommends \
        chromium xvfb fonts-noto-color-emoji fonts-freefont-ttf \
      && rm -rf /var/lib/apt/lists/*; \
    fi

# Install Bun (needed to run MonokerOS MCP server)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install OpenClaw globally
RUN npm install -g openclaw@latest

# Create non-root user directories
RUN mkdir -p /home/node/.openclaw /data && chown -R node:node /home/node /data

# Copy MCP server into the image (mounted as volume in dev)
COPY packages/mcp /app/mcp
COPY packages/types /app/types
COPY packages/constants /app/constants
COPY packages/utils /app/utils

WORKDIR /app/mcp
RUN bun install --frozen-lockfile 2>/dev/null || bun install

USER node
ENV HOME=/home/node
ENV TERM=xterm-256color
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 18789

ENTRYPOINT ["openclaw"]
CMD ["gateway", "--bind", "lan", "--port", "18789"]
