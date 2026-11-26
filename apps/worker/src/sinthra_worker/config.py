"""The worker's configuration, read from environment variables."""

import math
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

_NAMES = ("SINTHRA_VERSION", "WORKER_HEARTBEAT_FILE", "WORKER_HEARTBEAT_INTERVAL")


@dataclass(frozen=True)
class WorkerConfig:
    """Validated settings the worker runs with."""

    version: str
    heartbeat_file: Path
    heartbeat_interval: float
    """Seconds between heartbeat touches."""


class ConfigError(Exception):
    """Raised when the environment is missing a variable or holds an invalid value."""


def load_config(source: Mapping[str, str]) -> WorkerConfig:
    """Read and validate the worker's environment variables."""

    missing = [name for name in _NAMES if not source.get(name)]

    if missing:
        raise ConfigError(_listing("Missing worker environment variables:", missing))

    problems: list[str] = []

    version = source["SINTHRA_VERSION"]
    heartbeat_file = Path(source["WORKER_HEARTBEAT_FILE"])

    # Checked here so a typo fails at startup with this message, not as an OSError on first touch.
    if not heartbeat_file.parent.is_dir():
        problems.append(f"WORKER_HEARTBEAT_FILE: directory {heartbeat_file.parent} does not exist")

    heartbeat_interval = _parse_interval(source["WORKER_HEARTBEAT_INTERVAL"])

    if heartbeat_interval is None:
        problems.append("WORKER_HEARTBEAT_INTERVAL: must be a positive number of seconds")

    if problems or heartbeat_interval is None:
        raise ConfigError(_listing("Invalid worker environment:", problems))

    return WorkerConfig(
        version=version,
        heartbeat_file=heartbeat_file,
        heartbeat_interval=heartbeat_interval,
    )


def _parse_interval(raw: str) -> float | None:
    try:
        value = float(raw)
    except ValueError:
        return None

    return value if math.isfinite(value) and value > 0 else None


def _listing(heading: str, lines: list[str]) -> str:
    return "\n".join([heading, *(f"  {line}" for line in lines)])
