# Self-hosted Postgres with TimescaleDB for telemetry

Telemetry and metadata both live in one self-hosted Postgres instance with the TimescaleDB Community edition, running on Sinthra's own droplet. The project's main goal is learning SQL and database engineering, and Postgres skills transfer far more widely than ClickHouse's dialect. Self-hosting gives full control over server tuning, plus the compression and continuous aggregates that providers' managed TimescaleDB leaves out.

## Considered Options

- **ClickHouse**: better compression and faster analytical queries at high volume, but needs more RAM and its SQL dialect and data model are niche. It stays open as a later, measured move for a single signal (most likely logs). The rest of the code talks to storage only through an interface so that move stays possible.
- **The existing managed DigitalOcean Postgres**: heavy insert and aggregation load would compete with other production apps on the same cluster. Managed Postgres also hides server configuration and offers only the Apache-licensed edition of TimescaleDB.
