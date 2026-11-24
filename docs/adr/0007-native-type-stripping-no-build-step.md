# TypeScript runs through Node's native type stripping, with no build step

The API runs its `.ts` source directly on Node, in development and in the production image alike, using Node's built-in type stripping. `tsc` only typechecks (`--noEmit`) and never emits JavaScript. Workspace packages such as `@sinthra/types` are consumed as TypeScript source, by Node in the API and by Vite in the web app. This removes the build ordering, watch processes and `dist/` folders a compiled monorepo needs, and what runs is exactly what was reviewed.

## Considered Options

- **Compile with `tsc` to `dist/`**: the conventional setup with no syntax restrictions, but it needs project references or an ordered build, a watcher in development, and packages that export compiled output. Switching to it later is cheap if type stripping ever gets in the way.
- **A third-party runner such as `tsx`**: full TypeScript syntax without a build, but it adds a dependency to do what Node now does by itself.

## Consequences

- Only erasable TypeScript syntax is allowed: no `enum`, no `namespace`, no constructor parameter properties. The `erasableSyntaxOnly` compiler option enforces this.
- Node refuses to strip types from files under `node_modules`. Workspace packages work because pnpm links them and Node resolves the link to its real path outside `node_modules`. Docker images must therefore keep the workspace layout and cannot flatten dependencies with `pnpm deploy`.
- Type errors never block the API from starting, so typechecking has to run as a separate step.
