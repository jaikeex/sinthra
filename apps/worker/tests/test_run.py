import threading
from pathlib import Path

from sinthra_worker.config import WorkerConfig
from sinthra_worker.worker import run


def test_run_touches_heartbeat_and_returns_once_stopped(tmp_path: Path) -> None:
    heartbeat = tmp_path / "heartbeat"
    config = WorkerConfig(version="0.0.0-test", heartbeat_file=heartbeat, heartbeat_interval=60.0)
    stop = threading.Event()
    threading.Timer(0.1, stop.set).start()

    run(config, stop)

    assert heartbeat.exists()
