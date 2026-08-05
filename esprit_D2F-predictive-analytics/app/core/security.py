import re
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.exceptions import UnauthorizedError

ROLE_PREFIX = "ROLE_"
SCOPE_CLAIM = "scope"
EMAIL_CLAIM = "email"
USER_ID_CLAIM = "userId"


def normalize_role(role: str) -> str:
    return role.upper().removeprefix(ROLE_PREFIX)


def has_role(scope_value: str, role: str) -> bool:
    return normalize_role(role) in {normalize_role(r) for r in scope_value.split()}


def decode_token(token: str, settings: Settings) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Token expiré") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Token invalide") from exc


@dataclass(frozen=True)
class CurrentUser:
    username: str
    user_id: str
    email: str
    roles: frozenset[str]

    @property
    def is_admin(self) -> bool:
        return "ADMIN" in self.roles

    @property
    def is_cup(self) -> bool:
        return "CUP" in self.roles

    @property
    def is_chef_departement(self) -> bool:
        return "CHEF_DEPARTEMENT" in self.roles

    @property
    def is_enseignant(self) -> bool:
        return "ENSEIGNANT" in self.roles

    def has_any_role(self, *roles: str) -> bool:
        return any(r in self.roles for r in roles)


def _extract_bearer(request: Request) -> str:
    authorization = request.headers.get("Authorization", "")
    match = re.match(r"^Bearer[ \t]+(\S+)$", authorization, re.IGNORECASE)
    if not match:
        raise UnauthorizedError("En-tête Authorization Bearer manquant")
    return match.group(1).strip()


def get_current_user(request: Request, settings: Settings = Depends(get_settings)) -> CurrentUser:
    if not settings.jwt_auth_enabled:
        return CurrentUser(username="system", user_id="system", email="", roles=frozenset({"SYSTEM"}))
    token = _extract_bearer(request)
    payload = decode_token(token, settings)
    roles = {normalize_role(r) for r in payload.get(SCOPE_CLAIM, "").split() if r.strip()}
    return CurrentUser(
        username=str(payload.get("sub", "")),
        user_id=str(payload.get(USER_ID_CLAIM, payload.get("sub", ""))),
        email=str(payload.get(EMAIL_CLAIM, "")),
        roles=frozenset(roles),
    )


def require_roles(*roles: str):
    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not user.has_any_role(*roles):
            raise UnauthorizedError(f"Rôle requis: {', '.join(roles)}")
        return user

    return dependency
