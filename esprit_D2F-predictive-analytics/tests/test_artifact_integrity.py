"""Tests for app.ml.artifact_integrity — hash/HMAC sidecar verification."""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from app.ml.artifact_integrity import (
    ArtifactIntegrityError,
    _sha256_of_file,
    load_with_hash_check,
    save_with_hash,
    verify_integrity,
)


@pytest.fixture
def isolated_env(monkeypatch, tmp_path):
    """Run each test with no signing key and verification enabled."""
    monkeypatch.delenv("MODEL_SIGNING_KEY", raising=False)
    monkeypatch.setenv("MODEL_VERIFY_INTEGRITY", "true")
    return tmp_path


def test_save_then_load_succeeds_with_sha256(isolated_env):
    path = str(isolated_env / "model.joblib")
    save_with_hash({"weights": [1, 2, 3]}, path)
    assert os.path.exists(path)
    assert os.path.exists(path + ".sha256")
    obj = load_with_hash_check(path)
    assert obj == {"weights": [1, 2, 3]}


def test_load_refuses_when_sidecar_missing(isolated_env):
    path = str(isolated_env / "no-sidecar.joblib")
    # Save WITHOUT sidecar by writing joblib directly.
    import joblib
    joblib.dump({"x": 1}, path)
    with pytest.raises(ArtifactIntegrityError) as ctx:
        verify_integrity(path)
    assert "sidecar" in str(ctx.value).lower()


def test_load_refuses_when_artifact_tampered(isolated_env):
    path = str(isolated_env / "model.joblib")
    save_with_hash({"original": True}, path)
    # Tamper with the artifact (preserve length to stay readable).
    with open(path, "r+b") as f:
        f.seek(0)
        f.write(b"\x00\x00\x00\x00\x00")
    with pytest.raises(ArtifactIntegrityError) as ctx:
        verify_integrity(path)
    assert "mismatch" in str(ctx.value).lower()


def test_save_with_hmac_when_key_set(isolated_env, monkeypatch):
    monkeypatch.setenv("MODEL_SIGNING_KEY", "ultra-secret-signing-key-1234")
    path = str(isolated_env / "model.joblib")
    save_with_hash({"v": 42}, path)
    assert os.path.exists(path + ".hmac")
    assert not os.path.exists(path + ".sha256")
    obj = load_with_hash_check(path)
    assert obj == {"v": 42}


def test_load_refuses_with_wrong_hmac_key(isolated_env, monkeypatch):
    # Save with key A, attempt to load with key B.
    monkeypatch.setenv("MODEL_SIGNING_KEY", "key-A-very-long-secret")
    path = str(isolated_env / "model.joblib")
    save_with_hash({"v": 1}, path)
    monkeypatch.setenv("MODEL_SIGNING_KEY", "key-B-different-secret")
    with pytest.raises(ArtifactIntegrityError):
        verify_integrity(path)


def test_verification_disabled_skips_check(isolated_env, monkeypatch, caplog):
    monkeypatch.setenv("MODEL_VERIFY_INTEGRITY", "false")
    path = str(isolated_env / "model.joblib")
    import joblib
    joblib.dump({"unsigned": True}, path)
    # Must NOT raise even without sidecar.
    verify_integrity(path)


def test_sha256_helper_correct_value(isolated_env):
    path = str(isolated_env / "blob.bin")
    Path(path).write_bytes(b"hello world")
    # Pre-computed: sha256("hello world") = b94d27b9934d3e08a52e52d7da7dabfa...
    assert _sha256_of_file(path) == (
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
    )
