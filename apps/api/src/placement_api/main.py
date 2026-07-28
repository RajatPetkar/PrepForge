import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from placement_api.api.v1.router import api_router
from placement_api.core.config import Settings, get_settings
from placement_api.core.errors import register_exception_handlers
from placement_api.core.logging import configure_logging
from placement_api.core.middleware import configure_middleware

logger = logging.getLogger(__name__)

_ALEMBIC_DIR = Path(__file__).resolve().parents[2] / "migrations"


def _run_migrations_sync() -> None:
    """Run Alembic ``upgrade head`` synchronously.

    Called once during application startup so that tables are always created
    regardless of whether the app is started via Docker or ``uvicorn`` directly.
    """
    from alembic import command
    from alembic.config import Config

    alembic_cfg = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(_ALEMBIC_DIR))
    alembic_cfg.set_main_option("sqlalchemy.url", get_settings().sync_database_url)
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Running database migrations ...")
    _run_migrations_sync()
    logger.info("Database migrations complete.")

    from placement_api.core.qdrant import init_qdrant_schema
    await init_qdrant_schema()
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create the FastAPI application.

    Keeping construction in a factory makes tests and future worker/API reuse easier.
    """
    app_settings = settings or get_settings()
    configure_logging(app_settings)

    app = FastAPI(
        title=app_settings.app_name,
        version=app_settings.app_version,
        debug=app_settings.debug,
        docs_url="/docs" if app_settings.enable_docs else None,
        redoc_url="/redoc" if app_settings.enable_docs else None,
        openapi_url="/openapi.json" if app_settings.enable_docs else None,
        lifespan=lifespan,
    )

    app.state.settings = app_settings
    configure_middleware(app, app_settings)
    register_exception_handlers(app)
    app.include_router(api_router, prefix=app_settings.api_v1_prefix)

    return app


app = create_app()
