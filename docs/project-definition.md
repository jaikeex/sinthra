# Sinthra: my own observability platform

> This document grows out of the first draft (`first-proposal.md`) and the design stress test that followed. It describes **what** Sinthra is and **why** it is shaped this way. It is not a plan: milestones, schedules and tunable numbers are left for later.
>
> Domain terms in **bold** are defined in [`GLOSSARY.md`](../GLOSSARY.md). Decisions that are hard to reverse are recorded as ADRs in [`docs/adr/`](./adr/).

## The concept

A platform that monitors my other deployed apps and services. Think of a lightweight, self-hosted alternative to Datadog, Grafana Cloud or New Relic.

My apps send it their telemetry (traces, logs and metrics) using the standard OpenTelemetry SDKs. Sinthra stores that telemetry and lets me explore individual requests, chart behaviour over time, see how services depend on each other, and get alerted when something goes wrong or looks unusual.

## Disclaimer and goals

This is a personal learning project, albeit a very complex and time-intensive one. I want to explore modern, complex technologies and approaches. I have the time and willpower to see this through. There is no financial pressure and no plan to turn this into a business. I don't mind tackling complex, arduous tasks by hand if they give me valuable knowledge and experience in return.

When goals conflict, they rank in this order:

1. **Learning.** SQL and database engineering in particular, which is my weakest area in backend development.
2. **Portfolio value.** A live, well-documented project I can show interviewers, with decisions and measurements to talk about.
3. **Real-world use.** Actually monitoring my own apps.

Some principles follow from these goals:

- **Build by hand where it teaches something and doesn't take ages.** Use as few third-party dependencies as possible. The exception is highly marketable software that adds real CV value. See [ADR-0002](./adr/0002-hand-built-over-libraries.md).
- **Security is a priority.** Dedicated time will go into working through every attack vector I can think of.
- **Measure, then decide.** Bigger infrastructure (a message queue, ClickHouse) comes in only once a measured limit calls for it, and with a written decision.

## Core features

These are unchanged from the first draft, now with domain names attached:

- Collect logs, metrics and traces from applications.
- Visualize request lifecycles across multiple **Services** through distributed traces.
- Monitor application performance and resource consumption, through **Service metrics** and **App metrics**.
- Detect **Anomalies** and unusual behaviour.
- Create custom **Dashboards** and **Alert rules**.
- Show dependencies between Services (a service map).
- Explore individual requests through distributed traces.
- Run **Queries** against historical telemetry.
- Watch new telemetry arrive in a **Live tail**.

The signals are built in this order: **traces first** (the hardest and most impressive, and they exercise the most SQL), then **logs**, then **metrics**.

## The domain in brief

Everything in Sinthra is scoped to a **Project**, the boundary for both data and access. Data never crosses Projects.

- A Project contains **Services** (running applications, identified by their OpenTelemetry `service.name`). Its telemetry can be split into **Environments** such as prod and staging. Running `my-app` in prod and staging means one Project, one Service and two Environments.
- Telemetry comes in with an **Ingest key**: a named, revocable, write-only secret that decides which Project the data belongs to. A Project can have several keys, so one leaked key can be revoked without disturbing the other apps.
- A **User** sees a Project through a **Membership**, either as an **Owner** (full control) or a **Viewer** (read-only). The **Admin** manages the instance itself.
- A **Public Project** can be viewed by anyone, read-only and without logging in.

Two Projects exist from the start:

- **`personal`**: my real apps. Private.
- **`demo`**: data from the OpenTelemetry demo app. Public, and the part I show interviewers, so my real telemetry is never exposed.

A third, **`sinthra`**, holds Sinthra's own telemetry (see [Self-monitoring](#self-monitoring)).

## Architecture

```
  my apps ──OTLP──▶ OpenTelemetry Collector ──OTLP/HTTP──▶ ┐
                    (scrubbing, retries,                   │
                     durable buffering)                    │
                                                           ▼
  demo replayer ─────────────OTLP/HTTP────────────▶  Fastify API ──▶ Postgres + TimescaleDB
                                                     (ingest,            ▲        │
                                                      queries,           │        │ LISTEN/NOTIFY
                                                      auth, WS)          │        ▼
                                                           ▲        Python worker (Anomalies)
                                                           │
  browser ──▶ nginx ──▶ static landing page + React SPA ───┘  (same origin)
```

Everything runs with Docker Compose on a single DigitalOcean droplet, separate from the droplets of the apps it monitors. Telemetry travels over the private VPC network where possible.

### Ingestion

- Sinthra accepts **only OTLP over HTTP** (protobuf or JSON). There is no custom format and no gRPC at first. Instrumentation uses the official OpenTelemetry SDKs; Sinthra does not ship its own.
- My real apps send through an **OpenTelemetry Collector**, which scrubs sensitive data (headers, SQL parameters, user identifiers, tokens) and buffers and retries when Sinthra is busy.
- Ingestion has two stages: **accept** (decode, check, resolve the Project) and **write** (store). Today a bounded in-memory buffer sits between them. When it fills up, Sinthra answers `429`/`503` with `Retry-After`, and clients back off as the OTLP spec defines. Sinthra never pretends to accept data it can't store. Because the two stages are separate, a dedicated queue can be placed between them later without changing the external contract.
- **Telemetry is untrusted input.** There are hard limits on request size, decompressed size (against decompression bombs), attribute count and length, spans per request, and distinct series per Project (against cardinality explosions).
- **Client timestamps aren't trusted blindly.** Data dated too far in the future is rejected. Late data is accepted within a window, and rollups recompute that recent window so late data gets included.
- **No sampling for now.** Sinthra stores what it receives, and Service metrics assume unsampled data. Sampling-aware counting stays open for later.

### Storage

A **self-hosted Postgres with the TimescaleDB Community edition** on the Sinthra droplet holds both telemetry and metadata ([ADR-0001](./adr/0001-self-hosted-postgres-timescale-for-telemetry.md)).

- **Why not ClickHouse?** It's better at compression and large analytical queries, but its SQL dialect and data model are niche. The main goal is getting good at SQL, and Postgres teaches what most backend jobs use. ClickHouse stays a possible later, measured move for a single signal, most likely logs. Storage sits behind an interface so that move stays possible.
- **Why not my existing managed DigitalOcean Postgres?** Telemetry load would compete with my production apps on the same cluster. Managed Postgres also hides server tuning and offers only the Apache-licensed edition of TimescaleDB, which lacks compression and continuous aggregates.
- **Attributes use hybrid storage** ([ADR-0005](./adr/0005-hybrid-attribute-storage.md)). Well-known fields (Service, Environment, span name, status, duration, `http.route`, …) get real typed columns. Everything else goes into `jsonb` with a GIN index.
- **The Project is the isolation boundary, enforced by Postgres itself** ([ADR-0003](./adr/0003-project-is-the-isolation-boundary.md)). Every telemetry table has Row-Level Security policies keyed on the current Project, so a forgotten `WHERE` clause can't leak another Project's data.
- **Backups come in two tiers.** Account and configuration data (Users, Memberships, Dashboards, Alert rules, Ingest key hashes) gets encrypted, off-droplet backups with tested restores. Telemetry is large and short-lived by design, so its backups are best-effort.
- **Retention is set per Project,** with rollups kept longer than raw data. The exact periods will be decided later.

### Reading telemetry

- One structured **Query** shape (signal + filters + aggregation + group by + time bucket) underlies Dashboards, Alert rules and every filtered view. Queries are stored as JSON and turned into parameterized SQL by a hand-written compiler. That compiler is the heart of the SQL work and the single place where injection safety is decided.
- **Raw SQL** is an escape hatch for Owners only. It runs as a separate read-only database role, under the same Row-Level Security policies and a statement timeout. It is never available on a Public Project.
- **Dashboards** belong to one Project and are made of **Panels**, each one Query plus how to display it. Owners edit them. Viewers and anonymous visitors can only look, though they may change the time range.
- **Logs and traces link both ways** when logs carry trace context. Logs without it are fully supported on their own.

### Real-time

"Real-time" covers two things: **Live tail** and live-updating Dashboards. Both are delivered over WebSockets.

- New telemetry reaches subscribers in memory, but only **after it has been written**. That way viewers only ever see stored data, and a future queue won't break the feature.
- Low-volume events (Alerts, Anomalies) arrive through Postgres `LISTEN/NOTIFY`.
- Live views go through the same access checks as ordinary reads.

### Detection: Alert rules, Anomalies and Alerts

- An **Alert rule** is a condition an Owner defines, e.g. "error rate of `checkout` above 5% for 5 minutes".
- An **Anomaly** is something Sinthra finds by itself: a Service's behaviour moving well away from its own learned normal, taking daily patterns into account.
- Both raise an **Alert**, which is delivered through a single notification channel.

Anomaly detection runs only on aggregated **Service metrics** (request rate, error rate and latency, derived from spans). It never looks at raw spans one by one. **App metrics** (what apps send themselves, such as CPU or custom counters) are stored and charted as received.

### Where Python fits

Python does anomaly detection, statistical analysis, forecasting and eventually machine learning. It runs as a **separate worker that talks to the rest of Sinthra only through Postgres** ([ADR-0004](./adr/0004-python-integrates-through-postgres.md)). It reads rollups, writes Anomalies into its own tables, and the Node side picks them up via `LISTEN/NOTIFY`.

The worker is never on the ingestion path, so if it is slow or down, telemetry is still accepted and stored. It uses a database role restricted to its own tables.

### Self-monitoring

Sinthra reports its own telemetry into the `sinthra` Project. To avoid a feedback loop, where ingesting spans creates spans about ingesting spans, the ingestion endpoint emits only counters and histograms, never a span per request. The rest of the system (API, Python worker, database calls) is traced normally.

## Security

Security is a first-class goal, and the design already assumes a hostile environment:

- **Anonymous visitors** on Public Projects can run Queries. A per-query time limit, limits on time range and result size, and per-IP rate limiting protect the database. Raw SQL is never available there.
- **Telemetry content is attacker-controlled.** It is always rendered as text, never as HTML, to block stored XSS through a span attribute or log line.
- **Hand-rolled authentication:** passwords hashed with `scrypt` from `node:crypto`, server-side sessions stored in Postgres, `HttpOnly`/`Secure`/`SameSite` cookies, CSRF protection, and rate-limited login attempts.
- **Ingest keys** are stored only as hashes, shown once when created, write-only and individually revocable.
- **Row-Level Security** keeps Projects apart even if application code has a bug.
- **Database roles follow least privilege:** the app, raw SQL and the Python worker each get their own role.
- **Same-origin serving** of the frontend and API removes a whole class of cross-origin problems.

A dedicated pass for a full threat model comes later.

## Proposed tech stack

| Area               | Choice                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend           | React single-page app built with Vite, plus a static landing page; a third-party charting library                                                   |
| Backend API        | Fastify with strict TypeScript and JSON-schema validation; plain JSON over HTTP; WebSockets                                                         |
| Telemetry protocol | OpenTelemetry's protocol definitions with `@bufbuild/protobuf`                                                                                      |
| Database           | Self-hosted Postgres + TimescaleDB Community edition; hand-written SQL, no ORM; plain numbered `.sql` migrations with a small hand-written runner   |
| Analysis           | Python worker for Anomalies, statistics and forecasting                                                                                             |
| Repository         | One monorepo (pnpm workspaces) holding the API, web app, shared types and the Python worker                                                         |
| Deployment         | Docker Compose on a DigitalOcean droplet, nginx as reverse proxy, GitHub Actions for CI and deploys                                                 |
| Testing            | Vitest; mostly integration tests against a real Postgres + TimescaleDB in Docker, unit tests for pure logic, a few end-to-end OTLP ingestion checks |

**Built by hand on purpose:**

- All SQL and the Query compiler
- The migration runner
- Authentication and sessions
- Rate limiting
- The trace waterfall and service map layout
- The WebSocket message protocol

## Demo data

Interviewers see the public `demo` Project, never my real apps. The OpenTelemetry demo app (a multi-service shop with a load generator and switchable failure scenarios) produces realistic, varied traffic. It is too heavy to run next to Sinthra on one droplet, so it runs locally to **record** a few hours of telemetry. A small **replayer** on the droplet then sends that recording back in a loop with updated timestamps. It's cheap, it behaves the same way every time, and it's an interesting piece of engineering on its own.

## What the project exercises

| Area                        | Where it comes up                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Schema design               | Hybrid columns + `jsonb`, high-cardinality data, normalizing Service and resource data                          |
| Indexing                    | B-tree, BRIN for time-ordered data, GIN for `jsonb` and full-text search on logs, partial and composite indexes |
| Query plans                 | `EXPLAIN (ANALYZE, BUFFERS)` on Dashboard Queries, measuring the cost of Row-Level Security                     |
| Recursive and graph queries | Rebuilding trace trees, deriving the service map                                                                |
| Aggregation                 | Percentiles, rates, time bucketing, gap filling, continuous aggregates                                          |
| Data lifecycle              | Partitioning, chunk-based retention, compression, downsampling, late data                                       |
| Write performance           | Batching, `COPY` vs multi-row `INSERT`, backpressure                                                            |
| Postgres internals          | MVCC and vacuum under insert-heavy load, server tuning, `LISTEN/NOTIFY`                                         |
| Security                    | Row-Level Security, database roles, hand-rolled authentication, untrusted input, rate limiting                  |
| Frontend                    | Trace waterfall, service map, virtualized log viewer, live Dashboards over WebSockets                           |
| Operations                  | Self-hosted Postgres, backups and restore drills, Docker, nginx, CI/CD                                          |

## Non-goals (for now)

None of these are ruled out forever, but each one comes back only through a written decision:

- A multi-tenant SaaS. Sign-up exists in the design but is switched off.
- A custom query language beyond structured Queries and Owner-only raw SQL.
- Our own SDKs or agents.
- A message queue (the accept/write split keeps it possible).
- Browser/real-user monitoring and profiling.
- More than one notification channel.
- High availability or clustering. One droplet, some downtime acceptable.
- Sampling-aware Service metrics.
- Storing a Project's telemetry in a database its Owner provides. The per-Project storage boundary keeps this open, but it brings serious security work: SSRF through user-supplied hosts, storing other people's credentials, schema drift on databases we don't control.

## Still open

These are deliberately left for later planning:

- Which charting library
- Which notification channel
- The detailed threat model
