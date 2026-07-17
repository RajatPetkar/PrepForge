import logging
import sys

from pythonjsonlogger.json import JsonFormatter

from placement_api.core.config import Settings


def configure_logging(settings: Settings) -> None:
    handler = logging.StreamHandler(sys.stdout)

    if settings.log_json:
        formatter = JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        )
    else:
        formatter = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")

    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(settings.log_level.upper())

