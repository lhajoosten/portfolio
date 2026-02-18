from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PortfolioError
from app.core.security import create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse, UserResponse


class AuthenticationError(PortfolioError):
    """Raised when credentials are invalid."""


class InactiveUserError(PortfolioError):
    """Raised when an inactive user attempts to authenticate."""


class AuthService:
    def __init__(self, repo: UserRepository) -> None:
        self.repo = repo

    async def login(self, db: AsyncSession, *, email: str, password: str) -> TokenResponse:
        """
        Validate credentials and issue a JWT access token.

        Raises:
            AuthenticationError: If the email is not found or password is wrong.
            InactiveUserError: If the account is disabled.
        """
        user = await self.repo.get_by_email(db, email)
        if user is None or not verify_password(password, user.hashed_password):
            # Deliberately vague — do not reveal whether the email exists.
            raise AuthenticationError("Invalid email or password")

        if not user.is_active:
            raise InactiveUserError("Account is disabled")

        token = create_access_token(subject=str(user.id))
        return TokenResponse(access_token=token)

    async def get_current_user(self, db: AsyncSession, *, user_id: str) -> UserResponse:
        """
        Resolve a user by ID (extracted from a validated JWT).

        Raises:
            NotFoundError: If the user no longer exists in the database.
            InactiveUserError: If the account has been deactivated since the token was issued.
        """
        try:
            import uuid

            uid = uuid.UUID(user_id)
        except ValueError as exc:
            raise NotFoundError("User not found") from exc

        user = await self.repo.get_by_id(db, uid)
        if user is None:
            raise NotFoundError("User not found")

        if not user.is_active:
            raise InactiveUserError("Account is disabled")

        return UserResponse.model_validate(user)
