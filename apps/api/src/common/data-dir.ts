import { join, resolve } from 'node:path';

/** Resolves the ZeroClaw agent data directory from env or default. */
export const getDataDir = () =>
  resolve(process.env.ZEROCLAW_DATA_DIR || join(process.cwd(), 'data', 'agents'));

/** Resolves the team workspaces data directory. */
export const getTeamDataDir = () =>
  resolve(join(process.cwd(), 'data', 'workspaces'));

/** Resolves the project drives data directory. */
export const getProjectDataDir = () =>
  resolve(join(process.cwd(), 'data', 'projects'));

/** Resolves the workspace shared drive data directory. */
export const getWorkspaceDataDir = () =>
  resolve(join(process.cwd(), 'data', 'workspace'));
