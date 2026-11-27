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

Postgres runs in Docker, so you also need Docker with Compose v2 (Docker Desktop on Windows).

### Install and configure

```sh
pnpm install
cp .env.sample .env
```

`.env.sample` documents every variable. The API and the worker refuse to start if one they need is
missing or invalid. `POSTGRES_PASSWORD` is blank in the sample on purpose: set it before starting
Postgres.

The Python worker is a [uv](https://docs.astral.sh/uv/) project in `apps/worker`, outside the pnpm
workspace. It needs no separate install step: every `uv run` in the root scripts syncs its
environment first.

### Database

```sh
pnpm db:up
pnpm db:down
```

`db:up` starts Postgres with TimescaleDB in Docker and returns once its `pg_isready` healthcheck
passes. It listens on `127.0.0.1:DB_PORT` only, with the credentials from `.env`; compose
refuses to start if any of them is missing. Data lives in the `sinthra_db-data` volume, so it
survives `db:down`. To wipe it, run `docker volume rm sinthra_db-data` after `db:down`.

Both scripts run compose on [`infra/compose.yaml`](infra/compose.yaml) with the repo root as the
project directory, which is what makes compose read the root `.env`. Nothing connects to the
database yet.

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

### Stack

```sh
pnpm stack:up
pnpm stack:smoke
pnpm stack:down
```

`stack:up` builds the images from their Dockerfiles and runs everything in containers, as it will be
deployed: Postgres plus the services in compose's `stack` profile (`web`, `api` and `worker`). It
returns once every container passes its healthcheck. `stack:down` stops and removes them all,
Postgres included; its data volume survives, as with `db:down`.

The API and worker images report the root `package.json` version with the current commit as build
metadata, such as `0.1.0+a1b2c3d`. `stack:up` reads both and passes the result in as a build
argument, so the version in `.env` only applies to the apps run on the host. Uncommitted changes
are built in but don't show in the version.

`web` is nginx, serving the built Vite assets and proxying `/api/` to the API, so the browser sees
a single origin. It is the only `stack` service published to the host, on `127.0.0.1:WEB_PORT`;
Postgres stays on `127.0.0.1:DB_PORT`, as with `db:up`.

| URL                                                  | What it is                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `http://localhost:WEB_PORT/`                         | Static landing page                                          |
| `http://localhost:WEB_PORT/app/`                     | React SPA; any other path under `/app/` serves it too        |
| `http://localhost:WEB_PORT/api/...`                  | The API, proxied by nginx                                    |
| `http://localhost:WEB_PORT/v1/{traces,logs,metrics}` | Reserved for OTLP ingestion; they answer 404 until it exists |

Every response carries a strict Content Security Policy (same-origin sources only, no framing),
`X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`, and nginx hides its version.
There is no TLS yet, so no HSTS either.

nginx overwrites `X-Forwarded-For` and `X-Real-IP` with the connecting client's address, so the
API never sees a client-supplied value. Request bodies are capped at 1 MB, and static assets are
gzipped but API responses aren't, which rules out BREACH-style attacks on them. The access log,
in `docker compose logs web`, records paths without query strings and without the Referer, so
tokens in URLs never reach it.

The API and the worker have no published ports. To check the API directly, ask from inside its
container:

```sh
docker compose --project-directory . --file infra/compose.yaml exec api node --eval "fetch('http://127.0.0.1:3000/api/health').then((r) => r.text()).then(console.log)"
```

The worker container is healthy while its heartbeat file is no older than two
`WORKER_HEARTBEAT_INTERVAL`s. `docker compose stop` sends it SIGTERM, which is where the shutdown
path gets exercised for real: on a Windows host nothing can send it SIGTERM, only Ctrl+C. Its
log shows the version, then the shutdown:

```sh
docker compose --project-directory . --file infra/compose.yaml logs worker
```

#### Verifying the stack

After `pnpm stack:up`, `pnpm stack:smoke` checks the stack over HTTP through nginx on
`127.0.0.1:WEB_PORT`, as a browser sees it. It doesn't start or stop anything. It checks that:

- `/api/health` answers `200` with status `ok` and the version of the current commit.
- `/app/` and a deep link under it serve the SPA's entry page.
- Every response carries the three security headers above and a `Server: nginx` header with no
  version.
- The reserved `/v1/traces` path answers `404`.

Every check runs even after one fails, each prints `PASS` or `FAIL`, and the script exits non-zero
if any failed. A version mismatch usually means the stack was built from an older commit: run
`stack:up` again.

Container health needs no check of its own: `stack:up` returns only once every container passes
its healthcheck. Two things are left to check by hand, in a browser:

1. `http://localhost:WEB_PORT/` shows the landing page, and its link opens the SPA, which shows
   status `ok` and the version.
2. The browser console shows no Content Security Policy violations. A 404 for `/favicon.ico` is
   expected: there is no favicon yet.

### Checks

Run from the repository root. Each aggregate command covers both the TypeScript and the Python
side; the `:ts` variants run only the TypeScript part and the `:worker` variants only the worker's.

| Command          | TypeScript (`pnpm <command>:ts`)       | Worker (`pnpm <command>:worker`) |
| ---------------- | -------------------------------------- | -------------------------------- |
| `pnpm lint`      | ESLint with type-aware rules           | `ruff check`                     |
| `pnpm typecheck` | `tsc --noEmit` in every package        | `mypy --strict`                  |
| `pnpm test`      | Vitest in every package that has tests | pytest                           |
| `pnpm format`    | Prettier rewrites files                | `ruff format`                    |

`pnpm format:check` checks formatting on both sides without rewriting anything; it splits into
`format:check:ts` and `format:check:worker` the same way.

`pnpm build` runs the `build` script of every workspace package that defines one. Today that is
only the web app; the API runs its TypeScript directly and has no build step.

### Layout

| Path        | Contents                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `apps/`     | Deployable applications: `api` (Fastify), `web` (Vite: landing page and React SPA), `worker` (Python, uv) |
| `packages/` | Shared packages: `types` (`@sinthra/types`, the API contract as TypeBox schemas)                          |
| `infra/`    | Infrastructure: the compose file                                                                          |
| `scripts/`  | Node scripts behind root commands that a one-line `package.json` script can't express portably            |
