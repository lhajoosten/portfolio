from fastapi import APIRouter
from app.api.v1.routes import projects, ai

api_router = APIRouter()

api_router.include_router(projects.router)
api_router.include_router(ai.router)
