# The Python worker integrates through Postgres, not an API

The Python anomaly worker has no HTTP or RPC interface. It reads rollups from Postgres, writes Anomalies into tables it owns, and the Node side learns about new rows through `LISTEN/NOTIFY`. Two services sharing a database is usually an anti-pattern. It is accepted here because both run on one host, Postgres is already the system's source of truth, and an API between them would add a network surface to secure and keep running for no gain in a single-node deployment.

## Consequences

- The worker sits outside the ingestion path entirely: if it is slow or down, telemetry is still accepted and stored, and only Anomaly detection pauses.
- Table ownership must stay explicit. The worker writes only its own tables and uses a database role restricted to them.
