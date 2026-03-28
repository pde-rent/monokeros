import type { RuntimeProfile } from "./types";

const NOVNC_PORT = 6080;
const VNC_PORT = 5900;
const GATEWAY_PORT = 18789;

const IMAGE = process.env.ZEROCLAW_IMAGE ?? "monokeros/zeroclaw:latest";

export const zeroclawHeadlessProfile: RuntimeProfile = {
  type: "zeroclaw",
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
  memory: 134_217_728,         // 128MB
  nanoCpus: 500_000_000,       // 0.5 CPU
  shmSize: 0,
  tmpfs: {},
  hasDesktop: false,
  configFileName: "config.toml",
  extraEnv: {
    HOME: "/home/agent",
    TERM: "xterm-256color",
    DESKTOP_MODE: "false",
  },
  healthEndpoint: "/health",
};

export const zeroclawDesktopProfile: RuntimeProfile = {
  type: "zeroclaw",
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
  memory: 1_610_612_736,       // 1.5GB
  nanoCpus: 1_500_000_000,     // 1.5 CPUs
  shmSize: 134_217_728,        // 128MB
  tmpfs: { "/tmp": "size=128M" },
  hasDesktop: true,
  configFileName: "config.toml",
  extraEnv: {
    RESOLUTION: "854x480",
    DISPLAY: ":1",
    HOME: "/home/agent",
    TERM: "xterm-256color",
    DESKTOP_MODE: "true",
  },
  healthEndpoint: "/health",
};

/** @deprecated Use zeroclawHeadlessProfile or zeroclawDesktopProfile */
export const zeroclawProfile = zeroclawHeadlessProfile;
