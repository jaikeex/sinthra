# Must match `node` and `pnpm` in mise.toml; change them together.
ARG NODE_VERSION=24.22.3
ARG PNPM_VERSION=12.21.0

FROM node:${NODE_VERSION}-slim AS deps

ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION}

WORKDIR /sinthra

# Manifests first, so source edits don't invalidate the dependency layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/

#?———————————————————————————————————————————————————————————————————————————————————————————————?#
#?                                        WORKSPACE LAYOUT                                       ?#
#
## Node refuses to strip types from files under node_modules. @sinthra/types only
## loads because pnpm links it from apps/api/node_modules to its real path in packages/types.
## pnpm deploy would copy it into node_modules and break that, so the image installs in place.
## --ignore-scripts skips the root prepare hook, which installs git hooks for development.
#
#?———————————————————————————————————————————————————————————————————————————————————————————————?#

RUN --mount=type=cache,id=pnpm-store,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --prod --ignore-scripts --filter "@sinthra/api..."

FROM node:${NODE_VERSION}-slim AS runtime

ARG SINTHRA_VERSION
RUN test -n "$SINTHRA_VERSION" || { echo 'build argument SINTHRA_VERSION is required' >&2; exit 1; }
ENV SINTHRA_VERSION=${SINTHRA_VERSION} \
    NODE_ENV=production

WORKDIR /sinthra

COPY --from=deps /sinthra ./
COPY packages/types/src packages/types/src
COPY apps/api/src apps/api/src

USER node

CMD ["node", "apps/api/src/server.ts"]
