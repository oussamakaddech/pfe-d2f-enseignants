"""Ports d'application — contrats abstraits."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date

from app.domain.services.context import TeacherContext


class TeacherContextProvider(ABC):
    @abstractmethod
    def build_context(self, teacher_id: str, as_of: date | None = None) -> TeacherContext | None:
        raise NotImplementedError
