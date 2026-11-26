# Sinthra

A self-hosted observability platform for my own apps: it takes in their OpenTelemetry traces, logs
and metrics, stores them, and lets me explore and alert on them. See
[`docs/project-definition.md`](docs/project-definition.md) for what it is and why, and
[`docs/adr/`](docs/adr/) for the decisions behind it.

## Development

### Prerequisites

[mise](https://mise.jdx.dev/) installs the pinned toolchain from [`mise.toml`](mise.toml):

```sh
mise install
```

The root `package.json` also pins pnpm through `packageManager`, so pnpm uses the right version even
without mise.

### Install and configure

```sh
pnpm install
cp env.sample .env
```

`env.sample` documents every variable. The API and the worker refuse to start if one they need is
missing or invalid.

The Python worker is a [uv](https://docs.astral.sh/uv/) project in `apps/worker`, outside the pnpm
workspace. It needs no separate install step: every `uv run` in the root scripts syncs its
environment first.

### Run

```sh
pnpm dev
```

This starts the API and the web app on the host, both reloading on change:

| URL                                | What it is                                      |
| ---------------------------------- | ----------------------------------------------- |
| `http://localhost:5173/`           | Static landing page                             |
| `http://localhost:5173/app/`       | React SPA, showing the API's health and version |
| `http://localhost:5173/api/health` | The API, through the Vite dev server's proxy    |
| `http://127.0.0.1:3000/api/health` | The API directly, at `API_HOST` and `API_PORT`  |

The Vite dev server proxies `/api` to the API, so the SPA calls it same-origin, as it will in
production.

The API runs its TypeScript source directly with Node's type stripping, so there is no build step
([ADR-0007](docs/adr/0007-native-type-stripping-no-build-step.md)). Type errors don't stop it from
starting, so run `pnpm typecheck` as well.

The worker runs separately, on the host:

```sh
pnpm dev:worker
```

It logs its version, touches `WORKER_HEARTBEAT_FILE` every `WORKER_HEARTBEAT_INTERVAL` seconds, and
exits cleanly on Ctrl+C or SIGTERM. It has no network port; the heartbeat file shows it is alive.

### Checks

Run from the repository root. Each aggregate command covers both the TypeScript and the Python
side; the `:worker` variants run only the worker's part.

| Command          | TypeScript                             | Worker (`pnpm <command>:worker`) |
| ---------------- | -------------------------------------- | -------------------------------- |
| `pnpm lint`      | ESLint with type-aware rules           | `ruff check`                     |
| `pnpm typecheck` | `tsc --noEmit` in every package        | `mypy --strict`                  |
| `pnpm test`      | Vitest in every package that has tests | pytest                           |
| `pnpm format`    | Prettier rewrites files                | `ruff format`                    |

`pnpm format:check` checks formatting on both sides without rewriting anything.

### Layout

| Path        | Contents                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `apps/`     | Deployable applications: `api` (Fastify), `web` (Vite: landing page and React SPA), `worker` (Python, uv) |
| `packages/` | Shared packages: `types` (`@sinthra/types`, the API contract as TypeBox schemas)                          |
