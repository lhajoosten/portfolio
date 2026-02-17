from fastapi import APIRouter

from app.api.v1.routes import ai, projects

api_router = APIRouter()

api_router.include_router(projects.router)
api_router.include_router(ai.router)
