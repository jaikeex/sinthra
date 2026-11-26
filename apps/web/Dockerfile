# Must match `node` and `pnpm` in mise.toml; change them together.
ARG NODE_VERSION=24.22.3
ARG PNPM_VERSION=12.21.0
ARG NGINX_VERSION=1.30.6

FROM node:${NODE_VERSION}-slim AS build

ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION}

WORKDIR /sinthra

# Manifests first, so source edits don't invalidate the dependency layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/

# Dev dependencies included: Vite and its plugins are what build the assets. --ignore-scripts skips
# the root prepare hook, which installs git hooks for development.
RUN --mount=type=cache,id=pnpm-store,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --ignore-scripts --filter "@sinthra/web..."

# Vite reads the tsconfigs to transform TypeScript, and they extend the root base config.
COPY tsconfig.base.json ./
COPY packages/types/src packages/types/src
COPY packages/types/tsconfig.json packages/types/
COPY apps/web apps/web
RUN pnpm --filter @sinthra/web run build

# The unprivileged variant runs nginx as a non-root user.
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine-slim AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /sinthra/apps/web/dist /usr/share/nginx/html
