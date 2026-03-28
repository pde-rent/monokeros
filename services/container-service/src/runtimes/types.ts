export type AgentRuntimeType = "zeroclaw" | "openclaw";

export interface RuntimeProfile {
  type: AgentRuntimeType;
  image: string;
  gatewayPort: number;
  exposedPorts: Record<string, object>;
  portBindings: Record<string, Array<{ HostPort: string }>>;
  binds(agentDataPath: string, mcpSourcePath: string): string[];
  memory: number;
  nanoCpus: number;
  shmSize: number;
  tmpfs: Record<string, string>;
  hasDesktop: boolean;
  configFileName: string;
  /** Extra env vars specific to this runtime */
  extraEnv: Record<string, string>;
  /** Health check endpoint path */
  healthEndpoint: string;
}
