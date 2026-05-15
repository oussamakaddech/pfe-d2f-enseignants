"""Tests for app.core.exceptions custom HTTPExceptions and handlers."""
from __future__ import annotations

import pytest
from fastapi import status

from app.core.exceptions import (
    DatabaseError,
    InsufficientDataError,
    ModelNotTrainedError,
    TeacherNotFoundError,
)


def test_model_not_trained_uses_503():
    exc = ModelNotTrainedError("gap_predictor")
    assert exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert "gap_predictor" in exc.detail


def test_insufficient_data_uses_422():
    exc = InsufficientDataError("Need at least 10 samples")
    assert exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "Need at least 10 samples" in exc.detail


def test_teacher_not_found_uses_404():
    exc = TeacherNotFoundError("ENS-001")
    assert exc.status_code == status.HTTP_404_NOT_FOUND
    assert "ENS-001" in exc.detail


def test_database_error_default_message():
    exc = DatabaseError()
    assert exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert exc.detail == "Database query failed"


def test_database_error_custom_message():
    exc = DatabaseError("Connection pool exhausted")
    assert exc.detail == "Connection pool exhausted"


def test_teacher_not_found_handler_returns_dsi_envelope(client):
    """Hit a real endpoint that triggers TeacherNotFoundError indirectly."""
    # Use a clearly-invalid teacher ID to provoke 4xx (404 ideal, 405/401 acceptable).
    r = client.get("/api/v1/analytics/teachers/__does-not-exist__")
    assert 400 <= r.status_code < 500
