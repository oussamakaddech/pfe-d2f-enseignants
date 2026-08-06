"""Tests du module d'intégrité des artefacts ML (fail-closed)."""
import os
import tempfile
from pathlib import Path

import joblib
import pytest

from app.infrastructure.ml.artifact_integrity import (
    ArtifactIntegrityError,
    load_with_integrity_check,
    save_with_integrity,
    verify,
)


@pytest.fixture
def tmp_dir():
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)


def _clear_env():
    os.environ.pop("MODEL_SIGNING_KEY", None)
    os.environ.pop("MODEL_VERIFY_INTEGRITY", None)


def test_roundtrip_sha256(tmp_dir):
    _clear_env()
    model = {"x": 1}
    path = tmp_dir / "m.joblib"
    save_with_integrity(model, path)
    assert (tmp_dir / "m.joblib.sha256").exists()
    loaded = load_with_integrity_check(path)
    assert loaded["x"] == 1


def test_missing_sidecar_refused_fail_closed(tmp_dir):
    _clear_env()
    path = tmp_dir / "m.joblib"
    joblib.dump({"x": 1}, path)
    with pytest.raises(ArtifactIntegrityError):
        load_with_integrity_check(path)


def test_tampered_artifact_refused(tmp_dir):
    _clear_env()
    path = tmp_dir / "m.joblib"
    save_with_integrity({"x": 1}, path)
    with open(path, "ab") as f:
        f.write(b"corrupted")
    with pytest.raises(ArtifactIntegrityError):
        load_with_integrity_check(path)


def test_hmac_mode_when_key_set(tmp_dir):
    os.environ["MODEL_SIGNING_KEY"] = "test-secret"
    _clear_env()
    os.environ["MODEL_SIGNING_KEY"] = "test-secret"
    try:
        path = tmp_dir / "m.joblib"
        save_with_integrity({"x": 1}, path)
        assert (tmp_dir / "m.joblib.hmac").exists()
        assert not (tmp_dir / "m.joblib.sha256").exists()
        assert load_with_integrity_check(path)["x"] == 1
        # Mauvaise clé -> HMAC mismatch
        os.environ["MODEL_SIGNING_KEY"] = "wrong-key"
        with pytest.raises(ArtifactIntegrityError):
            load_with_integrity_check(path)
    finally:
        os.environ.pop("MODEL_SIGNING_KEY", None)


def test_verify_disabled_explicitly(tmp_dir):
    os.environ["MODEL_VERIFY_INTEGRITY"] = "false"
    _clear_env()
    os.environ["MODEL_VERIFY_INTEGRITY"] = "false"
    try:
        path = tmp_dir / "m.joblib"
        joblib.dump({"x": 1}, path)  # pas de sidecar
        verify(path)  # ne doit PAS lever
        assert load_with_integrity_check(path)["x"] == 1
    finally:
        os.environ.pop("MODEL_VERIFY_INTEGRITY", None)
