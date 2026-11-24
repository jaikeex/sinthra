# The Project is the isolation boundary, enforced by Postgres

All telemetry storage is accessed one Project at a time, and no query spans Projects, not even for the Admin. Each request sets its Project inside a transaction, and Row-Level Security policies on every telemetry table refuse rows from any other Project. Owner-only raw SQL runs as a separate read-only database role under the same policies, with a statement timeout. A missing `WHERE` clause in application code therefore cannot leak another Project's data, which matters because Public Projects are open to anonymous visitors and sign-up may open later.

## Consequences

- RLS adds a cost to every telemetry query, which must be measured with query plans rather than assumed.
- Storage code receives a per-Project storage handle instead of a global connection. That keeps open the option of storing a Project's telemetry in a database its Owner provides, without building it now.
- Users and Memberships live only in Sinthra's own database.
