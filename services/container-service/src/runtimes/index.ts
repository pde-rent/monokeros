export type { RuntimeProfile, AgentRuntimeType } from "./types";
export { openclawDesktopProfile, openclawHeadlessProfile, openclawProfile } from "./openclaw";
export { zeroclawDesktopProfile, zeroclawHeadlessProfile, zeroclawProfile } from "./zeroclaw";

import type { AgentRuntimeType, RuntimeProfile } from "./types";
import { openclawDesktopProfile, openclawHeadlessProfile } from "./openclaw";
import { zeroclawDesktopProfile, zeroclawHeadlessProfile } from "./zeroclaw";

const profiles: Record<AgentRuntimeType, Record<string, RuntimeProfile>> = {
  openclaw: {
    true: openclawDesktopProfile,
    false: openclawHeadlessProfile,
  },
  zeroclaw: {
    true: zeroclawDesktopProfile,
    false: zeroclawHeadlessProfile,
  },
};

export function getRuntimeProfile(
  type: AgentRuntimeType,
  desktop: boolean = type === "openclaw",
): RuntimeProfile {
  const byDesktop = profiles[type];
  if (!byDesktop) {
    throw new Error(`Unknown runtime type: ${type}`);
  }
  return byDesktop[String(desktop)];
}
