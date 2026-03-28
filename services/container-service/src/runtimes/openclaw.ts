import type { RuntimeProfile } from "./types";

const NOVNC_PORT = 6080;
const VNC_PORT = 5900;
const GATEWAY_PORT = 18789;

const IMAGE = process.env.OPENCLAW_IMAGE ?? process.env.AGENT_IMAGE ?? process.env.AGENT_DOCKER_IMAGE ?? "monokeros/openclaw:latest";

export const openclawDesktopProfile: RuntimeProfile = {
  type: "openclaw",
  image: IMAGE,
  gatewayPort: GATEWAY_PORT,
  exposedPorts: {
    [`${NOVNC_PORT}/tcp`]: {},
    [`${GATEWAY_PORT}/tcp`]: {},
    [`${VNC_PORT}/tcp`]: {},
  },
  portBindings: {
    [`${NOVNC_PORT}/tcp`]: [{ HostPort: "0" }],
    [`${GATEWAY_PORT}/tcp`]: [{ HostPort: "0" }],
  },
  binds(agentDataPath: string, mcpSourcePath: string): string[] {
    return [
      `${agentDataPath}:/data/${agentDataPath.split("/").pop()}:rw`,
      `${agentDataPath}/chrome-cache:/home/agent/.cache/chromium:rw`,
      `${mcpSourcePath}:/opt/monokeros/mcp:ro`,
    ];
  },
  memory: 2_147_483_648,       // 2GB
  nanoCpus: 2_000_000_000,     // 2 CPUs
  shmSize: 268_435_456,        // 256MB
  tmpfs: { "/tmp": "size=256M" },
  hasDesktop: true,
  configFileName: "openclaw.json",
  extraEnv: {
    RESOLUTION: "854x480",
    DISPLAY: ":1",
    HOME: "/home/agent",
    TERM: "xterm-256color",
    DESKTOP_MODE: "true",
  },
  healthEndpoint: "/v1/models",
};

export const openclawHeadlessProfile: RuntimeProfile = {
  type: "openclaw",
  image: IMAGE,
  gatewayPort: GATEWAY_PORT,
  exposedPorts: {
    [`${GATEWAY_PORT}/tcp`]: {},
  },
  portBindings: {
    [`${GATEWAY_PORT}/tcp`]: [{ HostPort: "0" }],
  },
  binds(agentDataPath: string, mcpSourcePath: string): string[] {
    return [
      `${agentDataPath}:/data/${agentDataPath.split("/").pop()}:rw`,
      `${mcpSourcePath}:/opt/monokeros/mcp:ro`,
    ];
  },
  memory: 536_870_912,         // 512MB
  nanoCpus: 1_000_000_000,     // 1 CPU
  shmSize: 0,
  tmpfs: {},
  hasDesktop: false,
  configFileName: "openclaw.json",
  extraEnv: {
    HOME: "/home/agent",
    TERM: "xterm-256color",
    DESKTOP_MODE: "false",
  },
  healthEndpoint: "/v1/models",
};

/** @deprecated Use openclawDesktopProfile or openclawHeadlessProfile */
export const openclawProfile = openclawDesktopProfile;
