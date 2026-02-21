# MonokerOS - Project Instructions

## Runtime & Tooling
- **Bun is the sole runtime**. Never use `node`, `npm`, `npx`, or `yarn` — always `bun` / `bunx`.
- **Typecheck with tsgo** (`@typescript/native-preview`), never `tsc`. Run: `bunx @typescript/native-preview --noEmit`
- TurboRepo runs via `bun run` (scripts in root package.json)
- NestJS API runs directly with `bun --watch src/main.ts`
- Next.js dev: `bunx next dev --port 3000 --turbopack`

## Commands
- `bun install` — install all workspace deps
- `bun run dev` — start both apps via turbo
- `bun run typecheck` — check all packages (uses tsgo via turbo)
- `bun run lint` — lint all packages
- API only: `cd apps/api && bun --watch src/main.ts`
- Web only: `cd apps/web && bunx next dev --port 3000 --turbopack`

## Protected Data — Do Not Modify
- **Industry presets** (`INDUSTRY_SUBTYPES`, `WORKSPACE_INDUSTRIES`, `LAUNCH_INDUSTRIES` in `packages/constants`) — never delete, rename, or alter industry entries unless explicitly asked. These are product-defined business data.
- **Enum values** (`WorkspaceIndustry` and other enums in `packages/types/src/enums.ts`) — never remove or rename members.

## Architecture
- TurboRepo monorepo with Bun workspaces
- `apps/web` — Next.js 15 + TurboPack (port 3000)
- `apps/api` — NestJS 11 on Bun runtime (port 3001)
- 8 shared packages under `packages/`: types, constants, ui, utils, mock-data, config, mcp, renderer
- All workspace packages use `main: "./src/index.ts"` (source-level references, no pre-build)
