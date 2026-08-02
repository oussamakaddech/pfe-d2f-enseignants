import jwt
import pytest

from app.core.config import Settings
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token, has_role, normalize_role, require_roles

SECRET = "test-secret-at-least-32-chars-long-for-hs512"


def _settings() -> Settings:
    return Settings(jwt_secret=SECRET, jwt_algorithm="HS512")


def _token(scope: str, expired: bool = False) -> str:
    import time

    now = int(time.time())
    payload = {"sub": "alice", "scope": scope, "email": "alice@esprit.tn", "userId": "U-ENS-1", "iat": now, "exp": now - 10 if expired else now + 3600}
    return jwt.encode(payload, SECRET, algorithm="HS512")


def test_decode_token_valid():
    payload = decode_token(_token("ROLE_ADMIN ROLE_CUP"), _settings())
    assert payload["sub"] == "alice"


def test_decode_token_expired_raises():
    with pytest.raises(UnauthorizedError):
        decode_token(_token("ROLE_ADMIN", expired=True), _settings())


def test_decode_token_bad_secret_raises():
    settings = Settings(jwt_secret="another-secret-at-least-32-chars-long-x", jwt_algorithm="HS512")
    with pytest.raises(UnauthorizedError):
        decode_token(_token("ROLE_ADMIN"), settings)


def test_normalize_role_strips_prefix():
    assert normalize_role("ROLE_ADMIN") == "ADMIN"
    assert normalize_role("admin") == "ADMIN"


def test_has_role_handles_space_separated_scope():
    assert has_role("ROLE_ADMIN ROLE_CUP", "ADMIN")
    assert has_role("ROLE_ADMIN ROLE_CUP", "chef_departement") is False


def test_require_roles_allows_matching_role():
    class FakeUser:
        def __init__(self) -> None:
            self.roles = frozenset({"ADMIN", "CUP"})

        def has_any_role(self, *roles: str) -> bool:
            return any(r in self.roles for r in roles)

    dependency = require_roles("ADMIN")
    assert dependency(FakeUser()) is not None


def test_require_roles_rejects_missing_role():
    class FakeUser:
        def __init__(self) -> None:
            self.roles = frozenset({"ENSEIGNANT"})

        def has_any_role(self, *roles: str) -> bool:
            return any(r in self.roles for r in roles)

    dependency = require_roles("ADMIN")
    with pytest.raises(UnauthorizedError):
        dependency(FakeUser())
