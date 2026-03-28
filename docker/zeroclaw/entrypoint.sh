#!/bin/bash
set -euo pipefail

AGENT_ID="${AGENT_ID:?AGENT_ID is required}"
CONFIG_DIR="/data/${AGENT_ID}"
CONFIG_FILE="${CONFIG_DIR}/config.toml"
RELOAD_FLAG="${CONFIG_DIR}/.reload"
GATEWAY_PORT="${GATEWAY_PORT:-18789}"
DESKTOP_MODE=${DESKTOP_MODE:-false}

# ── Desktop PIDs (initialized empty, set if DESKTOP_MODE=true) ────────────
XVNC_PID=""
OPENBOX_PID=""
TINT2_PID=""
WEBSOCKIFY_PID=""
CHROME_PID=""

# ── Conditional desktop startup ──────────────────────────────────────────────
if [ "$DESKTOP_MODE" = "true" ]; then
  DISPLAY_NUM=${DISPLAY_NUM:-1}
  RESOLUTION=${RESOLUTION:-854x480}
  COLOR_DEPTH=${COLOR_DEPTH:-24}
  VNC_PORT=${VNC_PORT:-5900}
  NOVNC_PORT=${NOVNC_PORT:-6080}
  export DISPLAY=":${DISPLAY_NUM}"

  echo "[zeroclaw] Starting desktop environment (${RESOLUTION}x${COLOR_DEPTH})"

  # Cleanup stale files
  rm -f "/tmp/.X${DISPLAY_NUM}-lock" "/tmp/.X11-unix/X${DISPLAY_NUM}" 2>/dev/null || true

  # Start Xvnc
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

  for i in $(seq 1 30); do
    if xdpyinfo -display "${DISPLAY}" >/dev/null 2>&1; then
      break
    fi
    sleep 0.1
  done
  echo "[zeroclaw] Xvnc started on display ${DISPLAY} (PID ${XVNC_PID})"

  # Start OpenBox
  openbox --config-file /home/agent/.config/openbox/rc.xml &
  OPENBOX_PID=$!
  echo "[zeroclaw] OpenBox started (PID ${OPENBOX_PID})"

  # Start Tint2
  tint2 -c /home/agent/.config/tint2/tint2rc &
  TINT2_PID=$!
  echo "[zeroclaw] Tint2 started (PID ${TINT2_PID})"

  # Start websockify
  websockify "${NOVNC_PORT}" "localhost:${VNC_PORT}" &
  WEBSOCKIFY_PID=$!
  echo "[zeroclaw] websockify started on port ${NOVNC_PORT} (PID ${WEBSOCKIFY_PID})"

  # Pre-launch Chrome
  CHROME_CDP_PORT=18800
  echo "[zeroclaw] Pre-launching Chrome on CDP port ${CHROME_CDP_PORT}..."
  /usr/bin/google-chrome-stable \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --no-first-run \
    --remote-debugging-port="${CHROME_CDP_PORT}" \
    --remote-allow-origins=* \
    --user-data-dir="/home/agent/.config/zeroclaw-chrome" \
    about:blank &>/dev/null &
  CHROME_PID=$!

  for i in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${CHROME_CDP_PORT}/json/version" >/dev/null 2>&1; then
      echo "[zeroclaw] Chrome CDP ready on port ${CHROME_CDP_PORT} after ${i}s (PID ${CHROME_PID})"
      break
    fi
    sleep 1
  done
else
  echo "[zeroclaw] Starting in headless mode (DESKTOP_MODE=false)"
fi

echo "[zeroclaw] Starting gateway for agent ${AGENT_ID}"

# Wait for config file
attempts=0
while [ ! -f "${CONFIG_FILE}" ]; do
  attempts=$((attempts + 1))
  if [ $attempts -ge 30 ]; then
    echo "[zeroclaw] ERROR: Config file not found after 30s: ${CONFIG_FILE}"
    exit 1
  fi
  echo "[zeroclaw] Waiting for config file..."
  sleep 1
done

# Start ZeroClaw gateway
start_gateway() {
  zeroclaw gateway \
    --config "${CONFIG_FILE}" \
    --port "${GATEWAY_PORT}" \
    --bind "0.0.0.0" &
  GATEWAY_PID=$!
  echo "[zeroclaw] Gateway started (PID ${GATEWAY_PID})"
}

# Graceful shutdown
cleanup() {
  echo "[zeroclaw] Shutting down..."
  kill ${CHROME_PID:+${CHROME_PID}} ${GATEWAY_PID:+${GATEWAY_PID}} ${WEBSOCKIFY_PID:+${WEBSOCKIFY_PID}} ${TINT2_PID:+${TINT2_PID}} ${OPENBOX_PID:+${OPENBOX_PID}} ${XVNC_PID:+${XVNC_PID}} 2>/dev/null || true
  wait
  echo "[zeroclaw] All processes stopped"
  exit 0
}

trap cleanup SIGTERM SIGINT

start_gateway

# Monitor for config reload + process health
while true; do
  sleep 2

  # Check desktop health (only when desktop is running)
  if [ "$DESKTOP_MODE" = "true" ] && [ -n "${XVNC_PID}" ]; then
    if ! kill -0 "${XVNC_PID}" 2>/dev/null; then
      echo "[zeroclaw] Xvnc exited unexpectedly"
      cleanup
    fi
  fi

  # Check if gateway is still running
  if ! kill -0 "${GATEWAY_PID}" 2>/dev/null; then
    echo "[zeroclaw] Gateway exited unexpectedly, restarting..."
    start_gateway
    continue
  fi

  # Check for reload flag
  if [ -f "${RELOAD_FLAG}" ]; then
    echo "[zeroclaw] Reload flag detected, restarting gateway..."
    rm -f "${RELOAD_FLAG}"
    kill "${GATEWAY_PID}" 2>/dev/null || true
    wait "${GATEWAY_PID}" 2>/dev/null || true
    sleep 1
    start_gateway
  fi
done
