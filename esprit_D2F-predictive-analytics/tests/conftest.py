import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_container
from app.core.config import get_settings
from app.main import app
from tests.fakes import build_fake_container, build_settings

TEST_SETTINGS = build_settings()


@pytest.fixture
def container():
    fake_container = build_fake_container(TEST_SETTINGS)
    app.dependency_overrides[get_container] = lambda: fake_container
    yield fake_container
    app.dependency_overrides.clear()


@pytest.fixture
def client(container) -> TestClient:
    app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_token(username: str, roles: list[str], user_id: str = "U-ENS-1", email: str = "user@esprit.tn") -> str:
    import jwt

    payload = {
        "sub": username,
        "scope": " ".join(f"ROLE_{role}" for role in roles),
        "email": email,
        "userId": user_id,
        "iat": 1700000000,
        "exp": 4700000000,
    }
    return jwt.encode(payload, TEST_SETTINGS.jwt_secret, algorithm=TEST_SETTINGS.jwt_algorithm)


def auth_headers(username: str, roles: list[str], user_id: str = "U-ENS-1") -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(username, roles, user_id)}"}
