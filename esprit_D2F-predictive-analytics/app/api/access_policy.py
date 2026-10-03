"""Politique d'accès appliquée par le service lui-même (défense en profondeur).

La gateway filtre déjà `/api/analyse/**` (AuthorizationFilter.getAnalyseRoles),
mais le service ne doit pas dépendre d'elle seule : en appel direct (réseau
Docker), un ENSEIGNANT lisait les écarts, risques et recommandations de
n'importe quel collègue sur 44 routes, surtout legacy (audit C3, 2026-09-24).

Ce middleware applique la même règle que la gateway, à TOUTES les routes :
- sondes de santé et documentation : publiques (healthcheck Docker) ;
- `/predict/train` : ADMIN ;
- agrégats non nominatifs du tableau de bord exécutif : pilotage + RESPONSABLE_DOSSIER ;
- `/api/v1/analytics/teachers/{id}/…` : authentification exigée ; le rôle et
  la PROPRIÉTÉ sont contrôlés par la route elle-même (un enseignant lit ses
  propres données, jamais celles d'un collègue : FORBIDDEN_SCOPE) ;
- tout le reste (données nominatives d'enseignants, tableaux de bord) : pilotage.

Les contrôles plus fins des routes (require_roles, périmètre CUP/chef)
s'appliquent en plus, jamais à la place.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.core.envelope import error_response
from app.core.exceptions import AppError, ForbiddenError, UnauthorizedError
from app.core.security import SCOPE_CLAIM, _extract_bearer, decode_token, normalize_role

PILOTAGE = frozenset({"ADMIN", "CUP", "D2F", "CHEF_DEPARTEMENT"})
EXECUTIF = PILOTAGE | {"RESPONSABLE_DOSSIER"}
ADMIN = frozenset({"ADMIN"})
AUTHENTIFIE = frozenset()  # tout rôle : la route applique ses propres contrôles

PUBLIC_PATHS = frozenset({
    "/health", "/api/health", "/api/v1/analytics/health", "/api/v1/analytics/ready",
    "/docs", "/docs/oauth2-redirect", "/redoc", "/openapi.json",
})
EXECUTIVE_AGGREGATES = ("/v1/analytics/formations-par-periode", "/v1/analytics/formations-par-up")
# Routes du moteur principal qui vérifient elles-mêmes rôle + propriété.
OWNERSHIP_CHECKED_PREFIX = "/api/v1/analytics/teachers/"


def required_roles(path: str) -> frozenset[str] | None:
    """Rôles admis pour ``path`` ; None = route publique."""
    normalized = path.rstrip("/") or "/"
    if normalized in PUBLIC_PATHS:
        return None
    if "/predict/train" in normalized:
        return ADMIN
    if normalized.endswith(EXECUTIVE_AGGREGATES):
        return EXECUTIF
    if normalized.startswith(OWNERSHIP_CHECKED_PREFIX):
        return AUTHENTIFIE
    return PILOTAGE


def _reject(exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.http_status, content=error_response([exc.to_dict()]))


class AccessPolicyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Mêmes paramètres que les routes : les remplacements de dépendances
        # (tests, configuration injectée) s'appliquent aussi à la politique.
        settings = request.app.dependency_overrides.get(get_settings, get_settings)()
        roles_admis = required_roles(request.url.path)
        if request.method == "OPTIONS" or roles_admis is None or not settings.jwt_auth_enabled:
            return await call_next(request)
        try:
            payload = decode_token(_extract_bearer(request), settings)
        except AppError as exc:
            return _reject(exc)
        roles = {normalize_role(r) for r in str(payload.get(SCOPE_CLAIM, "")).split() if r.strip()}
        if not roles:
            return _reject(UnauthorizedError("Jeton sans rôle"))
        if roles_admis and roles.isdisjoint(roles_admis):
            # 403, jamais 401 : l'utilisateur est authentifié ; un 401
            # déconnecterait la webapp (intercepteur axios).
            return _reject(ForbiddenError(f"Rôle requis : {', '.join(sorted(roles_admis))}"))
        return await call_next(request)
