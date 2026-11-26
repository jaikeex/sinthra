"""The worker's main loop."""

import threading

from sinthra_worker.config import WorkerConfig


def run(config: WorkerConfig, stop: threading.Event) -> None:
    """Touch the heartbeat file every interval until stop is set."""
    while True:
        config.heartbeat_file.touch()

        if stop.wait(config.heartbeat_interval):
            return
