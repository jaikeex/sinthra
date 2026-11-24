# Hybrid storage for telemetry attributes

Telemetry attributes are stored in two ways. Well-known fields, such as Service, Environment, span name, kind, status, duration, and common semantic attributes like `http.route`, `http.response.status_code` and `db.system`, get real typed columns. Every other attribute goes into a `jsonb` column with a GIN index. The fields most often filtered and grouped on get real column statistics, B-tree and BRIN indexes, and accurate planner estimates, while arbitrary attributes stay queryable without schema changes.

## Considered Options

- **All attributes in `jsonb`**: simplest, but filtering and grouping on hot fields is slower, and the planner estimates row counts poorly.
- **A key/value attribute table**: fully normalized, but every attribute becomes a row, which multiplies row counts and forces joins into every Query.

## Consequences

- Promoting an attribute to a column later takes a migration plus a backfill, so the list of promoted attributes should change rarely.
- The Query compiler has to know which attributes are columns and which live in `jsonb`.
