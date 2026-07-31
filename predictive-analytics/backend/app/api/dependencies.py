"""Dépendances FastAPI: assembly du graphe applicatif + RBAC."""

from __future__ import annotations

from functools import lru_cache

from fastapi import Header, HTTPException, status

from app.application.use_cases import AnalyticsUseCases
from app.core.config import settings
from app.core.exceptions import (
    InvalidTeacherIdError,
    LegacyIdNotAllowedError,
)
from app.domain.enums.teacher import (
    FORMATION_SERVICE_ID_PATTERN,
    LEGACY_TEACHER_ID_PATTERN,
    TEACHER_ID_PATTERN,
)
from app.engines.dashboard_engine import DashboardEngine
from app.infrastructure.cache.in_memory_cache import InMemoryCache
from app.infrastructure.repositories.curated_repository import CuratedRepository
from app.ml.inference.scoring import InferenceService


@lru_cache
def get_repository() -> CuratedRepository:
    return CuratedRepository(settings.curated_path, reference_date=None)


@lru_cache
def get_cache() -> InMemoryCache:
    return InMemoryCache(default_ttl_seconds=settings.cache_ttl_seconds)


@lru_cache
def get_inference() -> InferenceService:
    return InferenceService(get_repository(), settings.model_path)


@lru_cache
def get_use_cases() -> AnalyticsUseCases:
    repo = get_repository()
    return AnalyticsUseCases(
        repo,
        dashboard_engine=DashboardEngine(repo),
        inference=get_inference() if settings.ml_enabled else None,
        cache=get_cache(),
        cache_ttl=settings.cache_ttl_seconds,
    )


# ------------------------------------------------------------------------ IDs
def validate_teacher_id(teacher_id: str) -> str:
    tid = teacher_id.strip().upper()
    if TEACHER_ID_PATTERN.match(tid):
        return tid
    if LEGACY_TEACHER_ID_PATTERN.match(tid):
        raise LegacyIdNotAllowedError(teacher_id)
    if FORMATION_SERVICE_ID_PATTERN.match(tid):
        raise LegacyIdNotAllowedError(teacher_id)
    raise InvalidTeacherIdError(f"ID enseignant invalide: {teacher_id}")


# ----------------------------------------------------------------------- RBAC
def get_current_user_role(
    x_user_role: str = Header(default=""),
    authorization: str = Header(default=""),
) -> str:
    """Résolution du rôle. En production, le gateway d'auth injecte X-User-Role.

    Le fallback authorization est une passerelle de développement: tout header
    Authorization non vide est accepté en mode debug uniquement.
    """
    role = x_user_role.strip().upper()
    if role:
        return role
    if settings.debug and authorization:
        return "ADMIN"
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Rôle utilisateur manquant (header X-User-Role)",
    )


def require_roles(*roles: str):
    allowed = {r.upper() for r in roles}

    def dependency(role: str = __import__("fastapi").Depends(get_current_user_role)):
        if role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle {role} non autorisé. Requis: {', '.join(sorted(allowed))}",
            )
        return role

    return dependency
