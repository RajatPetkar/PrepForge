from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from placement_api.core.config import Settings


def configure_middleware(app: FastAPI, settings: Settings) -> None:
    # Always allow localhost origins for dev; use explicit list in production
    origins = [str(o) for o in settings.cors_origins]
    # Ensure localhost is always included (strips trailing slashes from pydantic url)
    default_dev = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"]
    all_origins = list(set(origins + default_dev))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=all_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
