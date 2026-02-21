# Contributing to MonokerOS

Thank you for your interest in contributing to MonokerOS. This guide covers the conventions and workflows that keep the codebase healthy and collaboration smooth.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Branch Naming](#branch-naming)
4. [Commit Messages](#commit-messages)
5. [Pull Request Process](#pull-request-process)
6. [Code Review Guidelines](#code-review-guidelines)
7. [Architecture Overview](#architecture-overview)
8. [Style Guide](#style-guide)
9. [Protected Data](#protected-data)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Bun** | >= 1.2 | Sole runtime. Never use `node`, `npm`, `npx`, or `yarn`. |
| **tsgo** | `@typescript/native-preview` | Type checker. Never use `tsc`. |
| **Git** | >= 2.40 | With SSH key configured for GitHub. |

---

## Development Setup

```bash
# Clone
git clone git@github.com:pde-rent/monokeros.git
cd monokeros

# Install dependencies
bun install

# Copy environment template (API)
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your API keys

# Start both apps via Turbo
bun run dev

# Or start individually:
# API  — cd apps/api && bun --watch src/main.ts
# Web  — cd apps/web && bunx next dev --port 3000 --turbopack
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run dev` | Start both apps via Turbo |
| `bun run typecheck` | Type-check all packages (uses tsgo) |
| `bun run lint` | Lint all packages |
| `bun run build` | Build all packages |
| `bun run clean` | Clean all build artifacts |

---

## Branch Naming

Use the following prefixes. Branch names are **lowercase**, use **hyphens** as separators, and should be concise (3-5 words).

```
<type>/<short-description>
<type>/<ticket-id>-<short-description>
```

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New functionality | `feature/whatsapp-channel` |
| `bugfix/` | Non-urgent bug fix | `bugfix/chat-scroll-position` |
| `hotfix/` | Urgent production fix | `hotfix/websocket-reconnect` |
| `release/` | Release preparation | `release/v0.2.0` |
| `refactor/` | Code restructuring | `refactor/daemon-lifecycle` |
| `docs/` | Documentation changes | `docs/api-reference` |
| `test/` | Test additions | `test/gateway-integration` |
| `chore/` | Configs, dependencies | `chore/upgrade-bun` |
| `perf/` | Performance improvements | `perf/query-optimization` |
| `ci/` | CI/CD pipeline changes | `ci/add-typecheck-step` |
| `ops/` | Infrastructure, deployment | `ops/docker-compose-stack` |

### Rules

- Always branch from `main` (or the relevant base branch).
- Delete branches after merge.
- Never push directly to `main`.

---

## Commit Messages

We follow the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | SemVer |
|------|-------------|--------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | - |
| `style` | Formatting, whitespace (no logic change) | - |
| `refactor` | Code restructuring (no behavior change) | - |
| `perf` | Performance improvement | PATCH |
| `test` | Adding or updating tests | - |
| `build` | Build system or external dependencies | - |
| `ci` | CI configuration and scripts | - |
| `chore` | Maintenance (configs, .gitignore, etc.) | - |
| `ops` | Infrastructure, deployment, monitoring | - |
| `revert` | Revert a previous commit | - |

### Scopes

Scopes map to workspace packages and apps:

```
feat(api): add WebSocket authentication
fix(web): resolve hydration mismatch on dashboard
docs(types): update JSDoc for WorkspaceIndustry
refactor(constants): restructure industry exports
chore(ui): update Tailwind CSS dependency
test(utils): add unit tests for date formatting
build(config): update tsconfig paths
feat(renderer): add LaTeX rendering
fix(mcp): handle connection timeout
ops(docker): add health check to compose stack
```

### Description Rules

- Use imperative, present tense: "add" not "added" or "adds"
- Do not capitalize the first letter
- No period at the end
- Max ~72 characters

### Breaking Changes

Two ways to indicate:

```
# Exclamation mark
feat(api)!: remove deprecated /v1/users endpoint

# Footer
feat(api): restructure authentication flow

BREAKING CHANGE: login endpoint now requires client_id parameter.
```

### Examples

```
feat(api): add user avatar upload endpoint

Implement multipart file upload for user avatars with
automatic resizing to 256x256px and WebP conversion.

Closes #234
```

```
fix(web): prevent infinite re-render in chat panel

The useEffect dependency array was missing conversationId,
causing the component to re-render on every state update.
```

```
chore: initial repository setup

Add .gitignore, CONTRIBUTING.md, and configure git remote.
```

---

## Pull Request Process

### Before Opening a PR

1. Ensure your branch is up-to-date with `main`.
2. Run the full check suite locally:
   ```bash
   bun run typecheck
   bun run lint
   bun run build
   ```
3. Write a clear PR title following commit conventions (e.g., `feat(api): add avatar upload`).

### PR Description Template

```markdown
## Summary
- Concise bullet points of what changed and why.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Refactor
- [ ] Documentation
- [ ] Performance improvement

## Related Issues
Closes #(issue)

## How Has This Been Tested?
Describe test scenarios.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Type checking passes (`bun run typecheck`)
- [ ] Lint passes (`bun run lint`)
- [ ] Build succeeds (`bun run build`)
- [ ] No new warnings
- [ ] Documentation updated if needed
```

### Merge Rules

- At least **1 approval** required.
- All CI checks must pass.
- Squash-merge by default for feature branches.
- Rebase-merge for release branches.

---

## Code Review Guidelines

- Complete reviews within **24 hours**.
- Keep PRs **small** (under 400 lines of diff when possible).
- Focus on: **correctness, readability, type safety, security**.
- Use "Request Changes" only for blocking issues; use comments for suggestions.
- Be constructive and specific in feedback.

---

## Architecture Overview

```
monokeros/
├── apps/
│   ├── api/          # NestJS 11 on Bun (port 3001)
│   └── web/          # Next.js 15 + TurboPack (port 3000)
├── packages/
│   ├── avatar/       # Avatar generation (sharp)
│   ├── config/       # Shared TypeScript configs
│   ├── constants/    # Business constants and enums
│   ├── mcp/          # Model Context Protocol server
│   ├── mock-data/    # Seed data and fixtures
│   ├── renderer/     # Markdown/LaTeX rendering
│   ├── templates/    # Workspace templates
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # React UI components
│   └── utils/        # Shared utilities
├── turbo.json        # Turbo task definitions
└── package.json      # Root workspace config
```

All packages use `main: "./src/index.ts"` (source-level references, no pre-build step).

---

## Style Guide

### TypeScript

- **Strict mode** enabled across all packages.
- Use `tsgo` (`@typescript/native-preview`) for type checking, never `tsc`.
- Prefer `interface` over `type` for object shapes.
- Use explicit return types on exported functions.

### General

- No unused imports or variables.
- No `console.log` in committed code (use proper logging).
- Prefer `const` over `let`; never use `var`.
- Use early returns to reduce nesting.
- Keep files focused — one module, one concern.

### Bun

- Always use `bun` / `bunx` — never `node`, `npm`, `npx`, or `yarn`.
- Use `Bun.serve()` for HTTP servers in the API.
- Use Bun's native APIs where available (file I/O, hashing, etc.).

---

## Protected Data

The following data is product-defined and must **not** be modified without explicit approval:

- **Industry presets** (`INDUSTRY_SUBTYPES`, `WORKSPACE_INDUSTRIES`, `LAUNCH_INDUSTRIES` in `packages/constants`) — never delete, rename, or alter industry entries.
- **Enum values** (`WorkspaceIndustry` and other enums in `packages/types/src/enums.ts`) — never remove or rename members.

---

## Security

- **Never commit secrets.** API keys, tokens, and passwords belong in `.env` files (which are gitignored).
- Use `process.env` for all sensitive configuration.
- If you discover a hardcoded secret, remove it immediately and rotate the credential.
- Report security vulnerabilities privately — do not open public issues.
