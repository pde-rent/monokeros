/**
 * CLI configuration management.
 *
 * Config file lives at ~/.mk/config (YAML, kubeconfig-inspired).
 *
 *   apiVersion: v1
 *   kind: Config
 *   current-context: dev
 *   contexts:
 *     - name: dev
 *       server: http://localhost:3211
 *       workspace: my-workspace
 *       api-key: mk_dev_system
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import YAML from "yaml";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MkContext {
  name: string;
  server: string;
  workspace: string;
  "api-key": string;
  /** Container service URL (defaults to server on port 3002) */
  "container-service"?: string;
}

export interface MkConfig {
  apiVersion: "v1";
  kind: "Config";
  "current-context": string;
  contexts: MkContext[];
}

// ── Paths ─────────────────────────────────────────────────────────────────────

const MK_DIR = join(homedir(), ".mk");
const CONFIG_PATH = join(MK_DIR, "config");

export function configDir(): string {
  return MK_DIR;
}

export function configPath(): string {
  return CONFIG_PATH;
}

// ── Read / Write ──────────────────────────────────────────────────────────────

function defaultConfig(): MkConfig {
  return {
    apiVersion: "v1",
    kind: "Config",
    "current-context": "local",
    contexts: [
      {
        name: "local",
        server: "http://localhost:3211",
        workspace: "",
        "api-key": "",
      },
    ],
  };
}

export function loadConfig(): MkConfig {
  if (!existsSync(CONFIG_PATH)) {
    return defaultConfig();
  }
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const parsed = YAML.parse(raw) as MkConfig;
  if (!parsed || !parsed.contexts) {
    return defaultConfig();
  }
  return parsed;
}

export function saveConfig(config: MkConfig): void {
  if (!existsSync(MK_DIR)) {
    mkdirSync(MK_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, YAML.stringify(config, { lineWidth: 120 }));
}

// ── Context helpers ───────────────────────────────────────────────────────────

export function currentContext(config: MkConfig): MkContext | undefined {
  return config.contexts.find((c) => c.name === config["current-context"]);
}

export function resolveContext(): MkContext {
  const config = loadConfig();
  const ctx = currentContext(config);
  if (!ctx) {
    throw new Error(
      `No context "${config["current-context"]}" found. Run: mk config set-context <name>`,
    );
  }

  // Env overrides (higher priority)
  if (process.env.MK_API_KEY) ctx["api-key"] = process.env.MK_API_KEY;
  if (process.env.MK_SERVER) ctx.server = process.env.MK_SERVER;
  if (process.env.MK_WORKSPACE || process.env.MONOKEROS_WORKSPACE) {
    ctx.workspace = process.env.MK_WORKSPACE || process.env.MONOKEROS_WORKSPACE || ctx.workspace;
  }

  return ctx;
}
