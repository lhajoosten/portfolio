"""ORM model package.

Import all models here so that ``Base.metadata`` is fully populated when
Alembic's ``env.py`` imports this package via ``import app.models``.
Every model that should appear in ``alembic revision --autogenerate`` output
must be imported at module level in this file.
"""

from app.models.certification import Certification
from app.models.post import Post
from app.models.project import Project
from app.models.user import User

__all__ = ["Certification", "Post", "Project", "User"]
