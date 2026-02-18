"""'initial schema'

Revision ID: a0390250674e
Revises:
Create Date: 2026-02-17 23:12:17.149027

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a0390250674e"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("tags", sa.ARRAY(sa.String()), nullable=False),
        sa.Column("tech_stack", sa.ARRAY(sa.String()), nullable=False),
        sa.Column("live_url", sa.String(length=500), nullable=True),
        sa.Column("repo_url", sa.String(length=500), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("featured", sa.Boolean(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_slug"), "projects", ["slug"], unique=True)
    op.execute("ALTER TABLE projects ADD COLUMN content_embedding vector(1536)")


def downgrade() -> None:
    op.drop_index(op.f("ix_projects_slug"), table_name="projects")
    op.drop_table("projects")
