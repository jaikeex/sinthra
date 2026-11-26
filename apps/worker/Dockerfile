# Must match `python` and `uv` in mise.toml; change them together.
ARG PYTHON_VERSION=3.15.2
ARG UV_VERSION=0.13.10

FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

FROM python:${PYTHON_VERSION}-slim AS build

COPY --from=uv /uv /usr/local/bin/uv

# Bytecode is compiled once here, since the runtime user can't write it next to the sources.
# The base image's interpreter is the only one used; uv must not download another.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /sinthra

# Dependencies first, so source edits don't invalidate the dependency layer.
COPY apps/worker/pyproject.toml apps/worker/uv.lock ./
RUN --mount=type=cache,id=uv-cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

# --no-editable installs the worker into the venv, so the runtime stage needs only the venv.
COPY apps/worker/src src
RUN --mount=type=cache,id=uv-cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

FROM python:${PYTHON_VERSION}-slim AS runtime

# The heartbeat lives in its own directory, the only place the worker user may write.
RUN useradd --system --no-create-home --shell /usr/sbin/nologin worker \
    && mkdir /run/sinthra \
    && chown worker:worker /run/sinthra

WORKDIR /sinthra

# The venv's interpreter links to /usr/local/bin/python, which this stage's base provides too.
COPY --from=build /sinthra/.venv .venv

ARG SINTHRA_VERSION
RUN test -n "$SINTHRA_VERSION" || { echo 'build argument SINTHRA_VERSION is required' >&2; exit 1; }
ENV SINTHRA_VERSION=${SINTHRA_VERSION} \
    WORKER_HEARTBEAT_FILE=/run/sinthra/heartbeat \
    PATH=/sinthra/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1

USER worker

CMD ["python", "-m", "sinthra_worker"]
