"""
Integration tests — Projects domain.

These tests hit the real FastAPI app with a real Postgres container (via the
fixtures in ``tests/conftest.py``). They verify the full request → service →
repository → database round-trip.

Run with:
    uv run pytest -m integration tests/integration/
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# GET /api/v1/projects/
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_projects_empty(client: AsyncClient) -> None:
    """Projects list returns an empty array on a fresh database."""
    response = await client.get("/api/v1/projects/", params={"published_only": False})
    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# POST /api/v1/projects/
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient) -> None:
    """Creating a project returns 201 with the full project payload."""
    payload = {
        "title": "Test Project",
        "description": "A project created in an integration test.",
        "tags": ["python", "fastapi"],
        "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
        "published": True,
        "featured": False,
    }
    response = await client.post("/api/v1/projects/", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert data["tags"] == payload["tags"]
    assert data["tech_stack"] == payload["tech_stack"]
    assert data["published"] is True
    assert "id" in data
    assert "slug" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_project_auto_generates_slug(client: AsyncClient) -> None:
    """Slug is auto-generated from the title when not provided."""
    payload = {
        "title": "My Awesome Project",
        "description": "Slug should be auto-generated.",
    }
    response = await client.post("/api/v1/projects/", json=payload)
    assert response.status_code == 201
    assert response.json()["slug"] == "my-awesome-project"


@pytest.mark.asyncio
async def test_create_project_explicit_slug(client: AsyncClient) -> None:
    """An explicit slug is preserved as-is."""
    payload = {
        "title": "Some Project",
        "description": "Has explicit slug.",
        "slug": "explicit-slug",
    }
    response = await client.post("/api/v1/projects/", json=payload)
    assert response.status_code == 201
    assert response.json()["slug"] == "explicit-slug"


@pytest.mark.asyncio
async def test_create_project_duplicate_slug_returns_409(client: AsyncClient) -> None:
    """Creating two projects with the same slug returns 409 Conflict."""
    payload = {
        "title": "Duplicate Slug Project",
        "description": "First.",
        "slug": "duplicate-slug",
    }
    r1 = await client.post("/api/v1/projects/", json=payload)
    assert r1.status_code == 201

    payload["description"] = "Second — should conflict."
    r2 = await client.post("/api/v1/projects/", json=payload)
    assert r2.status_code == 409
    assert "slug" in r2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_project_missing_required_fields_returns_422(client: AsyncClient) -> None:
    """Omitting required fields returns 422 Unprocessable Entity."""
    response = await client.post("/api/v1/projects/", json={"tags": ["x"]})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{slug}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_project_by_slug(client: AsyncClient) -> None:
    """Fetching a project by slug returns the correct project."""
    payload = {
        "title": "Slug Fetch Test",
        "description": "Fetch by slug.",
        "slug": "slug-fetch-test",
        "published": True,
    }
    await client.post("/api/v1/projects/", json=payload)

    response = await client.get("/api/v1/projects/slug-fetch-test")
    assert response.status_code == 200
    assert response.json()["slug"] == "slug-fetch-test"
    assert response.json()["title"] == "Slug Fetch Test"


@pytest.mark.asyncio
async def test_get_project_not_found_returns_404(client: AsyncClient) -> None:
    """Fetching a non-existent slug returns 404 with a detail message."""
    response = await client.get("/api/v1/projects/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert "detail" in body
    assert "request_id" in body


# ---------------------------------------------------------------------------
# PATCH /api/v1/projects/{slug}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient) -> None:
    """PATCH updates only the provided fields."""
    create_payload = {
        "title": "Original Title",
        "description": "Original description.",
        "slug": "update-test",
    }
    await client.post("/api/v1/projects/", json=create_payload)

    patch_response = await client.patch(
        "/api/v1/projects/update-test",
        json={"title": "Updated Title", "featured": True},
    )
    assert patch_response.status_code == 200
    data = patch_response.json()
    assert data["title"] == "Updated Title"
    assert data["featured"] is True
    # Fields not in the patch body must remain unchanged
    assert data["description"] == "Original description."


@pytest.mark.asyncio
async def test_update_project_not_found_returns_404(client: AsyncClient) -> None:
    """Patching a non-existent slug returns 404."""
    response = await client.patch(
        "/api/v1/projects/ghost-project",
        json={"title": "Will not apply"},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/projects/{slug}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient) -> None:
    """DELETE returns 204 and the project is no longer retrievable."""
    payload = {
        "title": "To Be Deleted",
        "description": "This project will be deleted.",
        "slug": "delete-me",
    }
    await client.post("/api/v1/projects/", json=payload)

    delete_response = await client.delete("/api/v1/projects/delete-me")
    assert delete_response.status_code == 204

    get_response = await client.get("/api/v1/projects/delete-me")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_not_found_returns_404(client: AsyncClient) -> None:
    """Deleting a non-existent project returns 404."""
    response = await client.delete("/api/v1/projects/never-existed")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/featured
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_featured_projects(client: AsyncClient) -> None:
    """Only projects with featured=True and published=True appear in the featured list."""
    await client.post(
        "/api/v1/projects/",
        json={
            "title": "Featured Published",
            "description": "Should appear.",
            "slug": "featured-pub",
            "featured": True,
            "published": True,
        },
    )
    await client.post(
        "/api/v1/projects/",
        json={
            "title": "Featured Unpublished",
            "description": "Should NOT appear.",
            "slug": "featured-unpub",
            "featured": True,
            "published": False,
        },
    )
    await client.post(
        "/api/v1/projects/",
        json={
            "title": "Not Featured",
            "description": "Should NOT appear.",
            "slug": "not-featured",
            "featured": False,
            "published": True,
        },
    )

    response = await client.get("/api/v1/projects/featured")
    assert response.status_code == 200

    slugs = [p["slug"] for p in response.json()]
    assert "featured-pub" in slugs
    assert "featured-unpub" not in slugs
    assert "not-featured" not in slugs


# ---------------------------------------------------------------------------
# Published-only filtering
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_projects_published_only_filter(client: AsyncClient) -> None:
    """``published_only=True`` (default) hides unpublished projects."""
    await client.post(
        "/api/v1/projects/",
        json={
            "title": "Visible",
            "description": "Published.",
            "slug": "pub-visible",
            "published": True,
        },
    )
    await client.post(
        "/api/v1/projects/",
        json={
            "title": "Hidden",
            "description": "Unpublished.",
            "slug": "pub-hidden",
            "published": False,
        },
    )

    # Default — published_only=True
    published_response = await client.get("/api/v1/projects/")
    slugs = [p["slug"] for p in published_response.json()]
    assert "pub-visible" in slugs
    assert "pub-hidden" not in slugs

    # Explicit published_only=False — both visible
    all_response = await client.get("/api/v1/projects/", params={"published_only": False})
    all_slugs = [p["slug"] for p in all_response.json()]
    assert "pub-visible" in all_slugs
    assert "pub-hidden" in all_slugs


# ---------------------------------------------------------------------------
# Error response shape
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_error_response_includes_request_id(client: AsyncClient) -> None:
    """Every error response body contains a ``request_id`` field for tracing."""
    response = await client.get("/api/v1/projects/nonexistent-for-request-id-check")
    assert response.status_code == 404
    body = response.json()
    assert "request_id" in body
    assert isinstance(body["request_id"], str)
    assert len(body["request_id"]) > 0

    # The same request_id must also appear in the response headers
    assert response.headers.get("x-request-id") == body["request_id"]
