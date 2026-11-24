# Hand-built over libraries, except for marketable tools

Sinthra is a learning project, so anything that teaches a core skill without taking unreasonably long is built by hand: all SQL (no ORM or query builder), the migration runner, authentication and sessions, rate limiting, the trace waterfall and service map layout, and the WebSocket message protocol. Third-party code is used where hand-building would mostly be tedium, or where the tool itself adds CV value: React, Fastify, Postgres/TimescaleDB, Docker, nginx, GitHub Actions, Vite, Vitest, a Postgres driver, OpenTelemetry's protocol definitions with a protobuf library, and a charting library.

## Consequences

- With no ORM, SQL is written and reviewed as SQL, and schema changes are plain numbered `.sql` migrations.
- Hand-rolled auth puts its security on us: password hashing, session handling, CSRF and brute-force protection all need deliberate tests.
