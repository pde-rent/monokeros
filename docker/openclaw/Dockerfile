# MonokerOS OpenClaw — agent container image
# Stack: Ubuntu 24.04 + OpenBox + Xvnc + websockify + Chromium + Bun + OpenClaw
#
# Each agent gets its own container from this single image.
# Desktop environment is conditionally started based on DESKTOP_MODE env var.

FROM ubuntu:24.04 AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8

# ── System packages ──────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      # Window manager + panel
      openbox tint2 \
      # VNC server (Xvnc = X server + VNC in one process)
      tigervnc-standalone-server tigervnc-common \
      # websockify (WS→TCP bridge)
      python3-websockify \
      # Desktop automation
      xdotool xclip xterm \
      # Fonts (needed for readable UI in screenshots)
      fonts-noto-color-emoji fonts-freefont-ttf fonts-liberation fonts-dejavu-core \
      # System essentials
      curl wget ca-certificates gnupg procps dumb-init unzip \
      # Chromium deps that may not be pulled automatically
      libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64 \
    && rm -rf /var/lib/apt/lists/*

# ── Google Chrome (reliable in containers, no snap issues) ───────────────────
RUN curl -fsSL https://dl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV CHROMIUM_PATH=/usr/bin/google-chrome-stable
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# ── Create agent user (non-root) ────────────────────────────────────────────
RUN groupadd -r agent && useradd -r -g agent -m -d /home/agent -s /bin/bash agent \
    && mkdir -p /home/agent/.vnc /home/agent/.config/openbox /data /workspace \
    && chown -R agent:agent /home/agent /data /workspace

# ── OpenBox config (minimal, no menus/keybinds) ─────────────────────────────
COPY --chown=agent:agent openbox-rc.xml /home/agent/.config/openbox/rc.xml
COPY --chown=agent:agent tint2rc /home/agent/.config/tint2/tint2rc

# ── Bun runtime + OpenClaw (installed directly for agent user) ───────────────
USER agent
ENV BUN_INSTALL=/home/agent/.bun
ENV PATH="/home/agent/.bun/bin:$PATH"
RUN curl -fsSL https://bun.sh/install | bash \
    && bun install --ignore-scripts -g openclaw@latest

# ── Patch playwright-core for Bun compatibility ───────────────────────────────
# Playwright bundles its own ws implementation in utilsBundleImpl.js which breaks
# under Bun's native WebSocket runtime. This patch makes playwright-core use the
# standalone ws npm package (already installed as an openclaw transitive dep)
# when running under Bun. See: https://github.com/oven-sh/bun/issues/9911
RUN UTILS=/home/agent/.bun/install/global/node_modules/playwright-core/lib/utilsBundle.js \
    && sed -i \
      -e 's|^const ws = require("./utilsBundleImpl").ws;|const ws = "Bun" in globalThis ? require("ws").WebSocket : require("./utilsBundleImpl").ws;|' \
      -e 's|^const wsServer = require("./utilsBundleImpl").wsServer;|const wsServer = "Bun" in globalThis ? require("ws").WebSocketServer : require("./utilsBundleImpl").wsServer;|' \
      -e 's|^const wsReceiver = require("./utilsBundleImpl").wsReceiver;|const wsReceiver = "Bun" in globalThis ? require("ws").Receiver : require("./utilsBundleImpl").wsReceiver;|' \
      -e 's|^const wsSender = require("./utilsBundleImpl").wsSender;|const wsSender = "Bun" in globalThis ? require("ws").Sender : require("./utilsBundleImpl").wsSender;|' \
      "$UTILS"
USER root

# ── Entrypoint ───────────────────────────────────────────────────────────────
COPY --chmod=755 entrypoint.sh /entrypoint.sh

USER agent
ENV HOME=/home/agent
ENV DISPLAY=:1
ENV TERM=xterm-256color
ENV DESKTOP_MODE=true

# VNC + websockify + OpenClaw ports
EXPOSE 5900 6080 18789

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/entrypoint.sh"]
