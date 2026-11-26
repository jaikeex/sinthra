"""Entry point"""

import logging
import os
import signal
import sys
import threading
from types import FrameType

from sinthra_worker.config import ConfigError, load_config
from sinthra_worker.worker import run

log = logging.getLogger("sinthra_worker")


def main() -> int:
    """Run the worker until terminated"""

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    try:
        config = load_config(os.environ)
    except ConfigError as error:
        print(error, file=sys.stderr)
        return 1

    stop = threading.Event()

    def request_stop(signum: int, _frame: FrameType | None) -> None:
        log.info("shutting down", signal.Signals(signum).name)
        stop.set()

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)

    log.info("sinthra worker %s starting", config.version)
    run(config, stop)
    log.info("sinthra worker stopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
