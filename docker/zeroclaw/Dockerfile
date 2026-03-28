# ZeroClaw agent runtime
# Same Ubuntu 24.04 base as OpenClaw. Desktop packages are included but
# the desktop stack is only started when DESKTOP_MODE=true (default: false).
FROM ghcr.io/zeroclaw-labs/zeroclaw:latest AS zeroclaw

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8

# ── System packages (includes desktop stack for optional DESKTOP_MODE) ─────
RUN apt-get update && apt-get install -y --no-install-recommends \
      # Window manager + panel (used when DESKTOP_MODE=true)
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
      ca-certificates curl wget gnupg procps dumb-init unzip \
      # Chromium deps that may not be pulled automatically
      libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64 \
    && rm -rf /var/lib/apt/lists/*

# ── Google Chrome (used when DESKTOP_MODE=true) ───────────────────────────
RUN curl -fsSL https://dl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV CHROMIUM_PATH=/usr/bin/google-chrome-stable

# Non-root agent user (same uid/gid convention as openclaw)
RUN groupadd -r agent && useradd -r -g agent -m -d /home/agent -s /bin/bash agent \
    && mkdir -p /home/agent/.vnc /home/agent/.config/openbox /data /workspace \
    && chown -R agent:agent /home/agent /data /workspace

# OpenBox + Tint2 config (used when DESKTOP_MODE=true)
COPY --chown=agent:agent openbox-rc.xml /home/agent/.config/openbox/rc.xml
COPY --chown=agent:agent tint2rc /home/agent/.config/tint2/tint2rc

# Copy ZeroClaw binary from upstream
COPY --from=zeroclaw /usr/local/bin/zeroclaw /usr/local/bin/zeroclaw

# Entrypoint script
COPY --chmod=755 entrypoint.sh /entrypoint.sh

USER agent
WORKDIR /home/agent

ENV HOME=/home/agent
ENV DISPLAY=:1
ENV TERM=xterm-256color
ENV DESKTOP_MODE=false

EXPOSE 5900 6080 18789

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/entrypoint.sh"]
