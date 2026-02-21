from fastapi import APIRouter

from app.api.v1.routes import ai, auth, certifications, posts, projects

api_router = APIRouter()

api_router.include_router(projects.router)
api_router.include_router(posts.router)
api_router.include_router(certifications.router)
api_router.include_router(ai.router)
api_router.include_router(auth.router)
