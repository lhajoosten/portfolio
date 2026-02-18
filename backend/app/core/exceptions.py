"""Domain exception hierarchy for the Portfolio application.

All application-level errors inherit from :class:`PortfolioError`, which
means a single ``except PortfolioError`` at the boundary is enough to catch
any known domain failure.  The global exception handlers registered in
``app.core.error_handlers`` map each subclass to the appropriate HTTP status
code, so **routes never need their own try/except blocks** for domain errors.

Hierarchy::

    Exception
    └── PortfolioError          (base — 400 by default)
        ├── NotFoundError       (→ 404)
        │   ├── ProjectNotFoundError
        │   ├── PostNotFoundError
        │   └── CertificationNotFoundError
        ├── ConflictError       (→ 409)
        │   └── SlugConflictError
        ├── ValidationError     (→ 422)
        └── ExternalServiceError (→ 502)
            └── AIServiceError

Example::

    # In a service method:
    project = await self.repo.get_by_slug(db, slug)
    if project is None:
        raise ProjectNotFoundError(f"Project '{slug}' not found")

    # The global handler in error_handlers.py turns this into:
    # HTTP 404  {"detail": "Project 'my-slug' not found", "request_id": "..."}
"""


class PortfolioError(Exception):
    """Base class for all domain errors raised by this application.

    Every subclass accepts a ``message`` string that is stored on the
    instance and forwarded to the HTTP response body as ``detail``.

    Args:
        message: Human-readable description of the error.  This string is
            returned directly to API clients, so keep it informative but
            free of internal implementation details.

    Attributes:
        message: The error description passed at construction time.

    Example::

        raise PortfolioError("Something went wrong")
    """

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


# ---------------------------------------------------------------------------
# 404 — Not Found
# ---------------------------------------------------------------------------


class NotFoundError(PortfolioError):
    """Raised when a requested resource does not exist in the database.

    Mapped to **HTTP 404** by the global exception handler.

    Prefer the more specific subclasses (e.g. :class:`ProjectNotFoundError`)
    so that error messages are self-describing.
    """


class ProjectNotFoundError(NotFoundError):
    """Raised when a project cannot be found by slug or ID.

    Example::

        raise ProjectNotFoundError(f"Project '{slug}' not found")
    """


class PostNotFoundError(NotFoundError):
    """Raised when a blog post cannot be found by slug or ID.

    Example::

        raise PostNotFoundError(f"Post '{slug}' not found")
    """


class CertificationNotFoundError(NotFoundError):
    """Raised when a certification record cannot be found by ID.

    Example::

        raise CertificationNotFoundError(f"Certification '{cert_id}' not found")
    """


# ---------------------------------------------------------------------------
# 409 — Conflict
# ---------------------------------------------------------------------------


class ConflictError(PortfolioError):
    """Raised when an operation would violate a uniqueness constraint.

    Mapped to **HTTP 409** by the global exception handler.
    """


class SlugConflictError(ConflictError):
    """Raised when a slug is already taken by an existing resource.

    Slugs must be globally unique within their domain (e.g. all projects
    share a slug namespace, all posts share theirs).

    Example::

        raise SlugConflictError(f"Project slug '{slug}' is already taken")
    """


# ---------------------------------------------------------------------------
# 422 — Validation
# ---------------------------------------------------------------------------


class ValidationError(PortfolioError):
    """Raised when business-rule validation fails beyond Pydantic's scope.

    Mapped to **HTTP 422** by the global exception handler.

    Use this for semantic validation that Pydantic cannot express (e.g.
    "a project must have at least one tag if it is marked featured").  For
    simple field-level validation, prefer Pydantic ``field_validator``
    instead.

    Example::

        if data.featured and not data.tags:
            raise ValidationError("Featured projects must have at least one tag")
    """


# ---------------------------------------------------------------------------
# 502 — External Service Errors
# ---------------------------------------------------------------------------


class ExternalServiceError(PortfolioError):
    """Raised when a call to an external service fails.

    Mapped to **HTTP 502** by the global exception handler.

    Subclass this for each external dependency so the call site can catch
    specific failure types if needed.
    """


class AIServiceError(ExternalServiceError):
    """Raised when the OpenAI / vLLM API returns an error or times out.

    This wraps ``openai.OpenAIError`` and similar exceptions so the rest of
    the application only needs to handle the portfolio's own error types.

    Example::

        try:
            async for chunk in client.chat.completions.create(..., stream=True):
                yield chunk.choices[0].delta.content
        except OpenAIError as exc:
            raise AIServiceError(f"AI stream failed: {exc}") from exc
    """
