from fastapi import APIRouter

from placement_api.api.v1.routes import (
    admin,
    auth,
    chat,
    documents,
    health,
    planner,
    resume,
    search,
    profile,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(search.router)
api_router.include_router(chat.router)
api_router.include_router(resume.router)
api_router.include_router(planner.router)
api_router.include_router(admin.router)
api_router.include_router(profile.router)
