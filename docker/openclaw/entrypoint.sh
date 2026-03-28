#!/bin/bash
# MonokerOS OpenClaw — container entrypoint
# Starts: [Xvnc → OpenBox → Tint2 → websockify → Chrome] (if DESKTOP_MODE=true) → OpenClaw
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
DISPLAY_NUM=${DISPLAY_NUM:-1}
RESOLUTION=${RESOLUTION:-854x480}
COLOR_DEPTH=${COLOR_DEPTH:-24}
VNC_PORT=${VNC_PORT:-5900}
NOVNC_PORT=${NOVNC_PORT:-6080}
OPENCLAW_PORT=${OPENCLAW_PORT:-18789}
DESKTOP_MODE=${DESKTOP_MODE:-true}

export DISPLAY=":${DISPLAY_NUM}"

# ── Desktop PIDs (initialized empty, set if DESKTOP_MODE=true) ────────────
XVNC_PID=""
OPENBOX_PID=""
TINT2_PID=""
WEBSOCKIFY_PID=""
CHROME_PID=""

# ── Conditional desktop startup ──────────────────────────────────────────────
if [ "$DESKTOP_MODE" = "true" ]; then
  echo "[openclaw] Starting desktop environment (${RESOLUTION}x${COLOR_DEPTH})"

  # Cleanup stale files
  rm -f "/tmp/.X${DISPLAY_NUM}-lock" "/tmp/.X11-unix/X${DISPLAY_NUM}" 2>/dev/null || true

  # Start Xvnc (X11 + VNC combined)
  Xvnc "${DISPLAY}" \
    -geometry "${RESOLUTION}" \
    -depth "${COLOR_DEPTH}" \
    -rfbport "${VNC_PORT}" \
    -SecurityTypes None \
    -AlwaysShared \
    -FrameRate 20 \
    -AcceptKeyEvents=1 \
    -AcceptPointerEvents=1 \
    -SendCutText=1 \
    -AcceptCutText=0 \
    -desktop "MonokerOS Agent" \
    -Log "*:stderr:30" \
    &
  XVNC_PID=$!

  # Wait for X server to be ready
  for i in $(seq 1 30); do
    if xdpyinfo -display "${DISPLAY}" >/dev/null 2>&1; then
      break
    fi
    sleep 0.1
  done
  echo "[openclaw] Xvnc started on display ${DISPLAY} (PID ${XVNC_PID})"

  # Start OpenBox window manager
  openbox --config-file /home/agent/.config/openbox/rc.xml &
  OPENBOX_PID=$!
  echo "[openclaw] OpenBox started (PID ${OPENBOX_PID})"

  # Start Tint2 panel
  tint2 -c /home/agent/.config/tint2/tint2rc &
  TINT2_PID=$!
  echo "[openclaw] Tint2 started (PID ${TINT2_PID})"

  # Start websockify (WebSocket → TCP VNC bridge)
  websockify \
    "${NOVNC_PORT}" \
    "localhost:${VNC_PORT}" \
    &
  WEBSOCKIFY_PID=$!
  echo "[openclaw] websockify started on port ${NOVNC_PORT} (PID ${WEBSOCKIFY_PID})"

  # Pre-launch Chrome for OpenClaw browser tool
  CHROME_CDP_PORT=18800
  echo "[openclaw] Pre-launching Chrome on CDP port ${CHROME_CDP_PORT}..."
  /usr/bin/google-chrome-stable \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --no-first-run \
    --remote-debugging-port="${CHROME_CDP_PORT}" \
    --remote-allow-origins=* \
    --user-data-dir="/home/agent/.config/openclaw-chrome" \
    about:blank &>/dev/null &
  CHROME_PID=$!

  # Wait for CDP readiness (up to 60s)
  for i in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${CHROME_CDP_PORT}/json/version" >/dev/null 2>&1; then
      echo "[openclaw] Chrome CDP ready on port ${CHROME_CDP_PORT} after ${i}s (PID ${CHROME_PID})"
      break
    fi
    sleep 1
  done
else
  echo "[openclaw] Starting in headless mode (DESKTOP_MODE=false)"
fi

# ── OpenClaw lifecycle helpers ─────────────────────────────────────────────
OPENCLAW_CONFIG="/data/${AGENT_ID}/openclaw.json"
RELOAD_FLAG="/data/${AGENT_ID}/.reload"
export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG}"
export OPENCLAW_STATE_DIR="/data/${AGENT_ID}"

start_openclaw() {
  if [ ! -f "${OPENCLAW_CONFIG}" ]; then
    echo "[openclaw] WARNING: No openclaw.json found at ${OPENCLAW_CONFIG}"
    echo "[openclaw] OpenClaw will not start until agent is provisioned."
    OPENCLAW_PID=""
    return
  fi
  echo "[openclaw] Starting OpenClaw on port ${OPENCLAW_PORT} (config: ${OPENCLAW_CONFIG})"
  bun run "$(which openclaw)" gateway \
    --bind lan \
    --port "${OPENCLAW_PORT}" \
    --allow-unconfigured \
    &
  OPENCLAW_PID=$!
  echo "[openclaw] OpenClaw started (PID ${OPENCLAW_PID})"
}

restart_openclaw() {
  echo "[openclaw] Reloading OpenClaw (config changed)..."
  if [ -n "${OPENCLAW_PID}" ] && kill -0 "${OPENCLAW_PID}" 2>/dev/null; then
    kill "${OPENCLAW_PID}" 2>/dev/null || true
    wait "${OPENCLAW_PID}" 2>/dev/null || true
  fi
  start_openclaw
}

# ── Start OpenClaw agent ────────────────────────────────────────────────────
start_openclaw

# ── Signal handling ──────────────────────────────────────────────────────────
cleanup() {
  echo "[openclaw] Shutting down..."
  kill ${CHROME_PID:+${CHROME_PID}} ${OPENCLAW_PID:+${OPENCLAW_PID}} ${WEBSOCKIFY_PID:+${WEBSOCKIFY_PID}} ${TINT2_PID:+${TINT2_PID}} ${OPENBOX_PID:+${OPENBOX_PID}} ${XVNC_PID:+${XVNC_PID}} 2>/dev/null || true
  wait
  echo "[openclaw] All processes stopped"
}
trap cleanup SIGTERM SIGINT

# ── Monitoring loop ──────────────────────────────────────────────────────────
while true; do
  # Check for config reload request
  if [ -f "${RELOAD_FLAG}" ]; then
    rm -f "${RELOAD_FLAG}"
    restart_openclaw
  fi

  # Check desktop health (only when desktop is running)
  if [ "$DESKTOP_MODE" = "true" ] && [ -n "${XVNC_PID}" ]; then
    if ! kill -0 "${XVNC_PID}" 2>/dev/null; then
      echo "[openclaw] Xvnc exited unexpectedly"
      cleanup
      exit 1
    fi
  fi

  if [ -n "${OPENCLAW_PID}" ] && ! kill -0 "${OPENCLAW_PID}" 2>/dev/null; then
    echo "[openclaw] OpenClaw exited unexpectedly"
    cleanup
    exit 1
  fi
  sleep 2
done
