# TypeBox schemas are the API contract

The JSON API's request and response shapes are defined once, as TypeBox schemas in `@sinthra/types`. Fastify uses those schemas at runtime to validate requests and serialize responses, and both the API and the web app derive their TypeScript types from the same schemas. A shape cannot change on one side without the other noticing, because there is only one definition. TypeBox joins the dependencies allowed by [ADR-0002](./0002-hand-built-over-libraries.md): it is Fastify's own type provider, and hand-writing the same thing would mostly be tedium.

## Considered Options

- **Types only, with JSON Schemas written separately in the API**: no extra dependency, but every endpoint is defined twice, and the two definitions drift without any error.
- **Hand-written JSON Schemas `as const`, with types derived by `json-schema-to-ts`**: also a single source of truth and closer to raw JSON Schema, but the derived types are harder to read and slower to check.

## Consequences

- Despite its name, `@sinthra/types` exports runtime values (the schemas), not only types. Both the API and the web app import it at runtime.
- The contract covers only the TypeScript side. The Python worker talks to the rest of Sinthra through Postgres ([ADR-0004](./0004-python-integrates-through-postgres.md)), so the database schema is its contract, and TypeBox schemas never reach it.
- OTLP ingestion is not part of this contract. Its shapes come from OpenTelemetry's protocol definitions.
