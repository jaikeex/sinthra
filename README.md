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

`env.sample` documents every variable. The API refuses to start if one is missing or invalid.

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

### Checks

Run from the repository root:

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `pnpm lint`      | ESLint with type-aware rules over the whole repository   |
| `pnpm typecheck` | `tsc --noEmit` in every package                          |
| `pnpm test`      | Vitest in every package that has tests                   |
| `pnpm format`    | Prettier rewrites files; `pnpm format:check` only checks |

### Layout

| Path        | Contents                                                                           |
| ----------- | ---------------------------------------------------------------------------------- |
| `apps/`     | Deployable applications: `api` (Fastify), `web` (Vite: landing page and React SPA) |
| `packages/` | Shared packages: `types` (`@sinthra/types`, the API contract as TypeBox schemas)   |
