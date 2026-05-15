"""Integrity verification for ML artifacts (joblib / pickle files).

Joblib internally uses pickle, which allows arbitrary code execution at load
time. Loading an attacker-controlled artifact compromises the service.

This module provides two layers of protection:

1. Hash sidecar (.sha256) : a SHA-256 digest is written next to each artifact
   on save, and verified before load. This catches accidental corruption and
   unauthenticated tampering.

2. HMAC-SHA256 (optional) : if MODEL_SIGNING_KEY is set in the environment,
   an HMAC is used instead of plain hash, providing authenticated integrity.
   Useful when the artifact storage is shared with untrusted parties.

Usage:
    integrity.save_with_hash(model_obj, "/path/to/model.joblib")
    model = integrity.load_with_hash_check("/path/to/model.joblib")
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Any

import joblib

logger = logging.getLogger(__name__)

_HASH_SUFFIX = ".sha256"
_HMAC_SUFFIX = ".hmac"
_SIGNING_KEY_ENV = "MODEL_SIGNING_KEY"
_VERIFY_ENV = "MODEL_VERIFY_INTEGRITY"


class ArtifactIntegrityError(Exception):
    """Raised when artifact integrity verification fails."""


def _sha256_of_file(path: str, chunk_size: int = 65536) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _hmac_of_file(path: str, key: bytes, chunk_size: int = 65536) -> str:
    h = hmac.new(key, digestmod=hashlib.sha256)
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _signing_key() -> bytes | None:
    raw = os.getenv(_SIGNING_KEY_ENV, "")
    return raw.encode("utf-8") if raw else None


def _verification_enabled() -> bool:
    """Defaults to True. Set MODEL_VERIFY_INTEGRITY=false to disable
    (intended for ad-hoc local experiments only).
    """
    return os.getenv(_VERIFY_ENV, "true").lower() not in ("false", "0", "no")


def save_with_hash(obj: Any, path: str) -> None:
    """Persist `obj` via joblib and write a SHA-256 (or HMAC) sidecar.

    If MODEL_SIGNING_KEY is set, an HMAC sidecar (.hmac) is written;
    otherwise a plain SHA-256 sidecar (.sha256).
    """
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    joblib.dump(obj, path)

    key = _signing_key()
    if key:
        digest = _hmac_of_file(path, key)
        with open(path + _HMAC_SUFFIX, "w", encoding="utf-8") as f:
            f.write(digest)
        logger.info("Wrote HMAC sidecar for %s", path)
    else:
        digest = _sha256_of_file(path)
        with open(path + _HASH_SUFFIX, "w", encoding="utf-8") as f:
            f.write(digest)
        logger.info("Wrote SHA-256 sidecar for %s", path)


def verify_integrity(path: str) -> None:
    """Raise ArtifactIntegrityError if the file at `path` fails its sidecar.

    If verification is disabled (env MODEL_VERIFY_INTEGRITY=false), no-op with
    a warning log. If no sidecar is present, raises (fail-closed) when
    verification is enabled.
    """
    if not _verification_enabled():
        logger.warning(
            "Integrity verification DISABLED via %s. Loading %s without check.",
            _VERIFY_ENV, path,
        )
        return

    key = _signing_key()
    if key:
        sidecar = path + _HMAC_SUFFIX
        if not os.path.exists(sidecar):
            raise ArtifactIntegrityError(
                f"No HMAC sidecar found for {path}. Refusing to load (set "
                f"{_VERIFY_ENV}=false to bypass for local experiments)."
            )
        expected = open(sidecar, "r", encoding="utf-8").read().strip()
        actual = _hmac_of_file(path, key)
        if not hmac.compare_digest(expected, actual):
            raise ArtifactIntegrityError(
                f"HMAC mismatch for {path} (expected {expected[:16]}..., got {actual[:16]}...)"
            )
        logger.info("HMAC verified for %s", path)
        return

    sidecar = path + _HASH_SUFFIX
    if not os.path.exists(sidecar):
        raise ArtifactIntegrityError(
            f"No SHA-256 sidecar found for {path}. Refusing to load (set "
            f"{_VERIFY_ENV}=false to bypass for local experiments)."
        )
    expected = open(sidecar, "r", encoding="utf-8").read().strip()
    actual = _sha256_of_file(path)
    if not hmac.compare_digest(expected, actual):
        raise ArtifactIntegrityError(
            f"SHA-256 mismatch for {path} (expected {expected[:16]}..., got {actual[:16]}...)"
        )
    logger.info("SHA-256 verified for %s", path)


def load_with_hash_check(path: str) -> Any:
    """Verify integrity then load the joblib artifact."""
    verify_integrity(path)
    return joblib.load(path)
