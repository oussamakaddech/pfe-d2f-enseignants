"""Vérification d'intégrité (SHA-256 / HMAC-SHA256) des artefacts ML.

Règle : joblib utilise pickle — charger un compromis revient à exécuter
du code arbitraire. Toute lecture d'artefact en production DOIT passer
par `load_with_integrity_check()`.

Politique :
- Si MODEL_VERIFY_INTEGRITY=false (défense expresse) → no-op avec warning.
- Sinon, refuse le chargement si le sidecar (.sha256 ou .hmac) est absent
  ou ne correspond pas au contenu du fichier. Fail-closed par défaut.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
from pathlib import Path
from typing import Any

import joblib

logger = logging.getLogger(__name__)

_HASH_SUFFIX = ".sha256"
_HMAC_SUFFIX = ".hmac"
_SIGNING_KEY_ENV = "MODEL_SIGNING_KEY"
_VERIFY_ENV = "MODEL_VERIFY_INTEGRITY"

_CHUNK_SIZE = 65536


class ArtifactIntegrityError(Exception):
    """Erreur levée si le hash ne matche pas ou est absent."""


# Calcule le SHA-256 d'un fichier par blocs (gère les gros artefacts).
def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(_CHUNK_SIZE), b""):
            h.update(chunk)
    return h.hexdigest()


# Calcule le HMAC-SHA256 d'un fichier avec la clé de signature
# (plus fort que le SHA-256 seul : sans la clé, on ne peut pas falsifier le sidecar).
def _hmac_of_file(path: Path, key: bytes) -> str:
    hm = hmac.new(key, digestmod=hashlib.sha256)
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(_CHUNK_SIZE), b""):
            hm.update(chunk)
    return hm.hexdigest()


# Renvoie la clé de signature depuis la variable d'environnement
# MODEL_SIGNING_KEY (None si non configurée → on retombe sur SHA-256 simple).
def _signing_key() -> bytes | None:
    raw = os.environ.get(_SIGNING_KEY_ENV, "")
    return raw.encode("utf-8") if raw else None


def _verification_enabled() -> bool:
    """Default: enabled. Set MODEL_VERIFY_INTEGRITY=false only for local dev."""
    return os.environ.get(_VERIFY_ENV, "true").strip().lower() not in ("false", "0", "no")


# Chemin du sidecar d'intégrité attendu : .hmac si une clé est configurée, sinon .sha256.
def _sidecar_path(path: Path) -> Path:
    key = _signing_key()
    if key:
        return Path(str(path) + _HMAC_SUFFIX)
    return Path(str(path) + _HASH_SUFFIX)


def save_with_integrity(obj: Any, path: Path) -> None:
    """Persiste l'artefact + son sidecar d'intégrité."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(obj, path)
    key = _signing_key()
    if key:
        digest = _hmac_of_file(path, key)
        Path(str(path) + _HMAC_SUFFIX).write_text(digest, encoding="utf-8")
        logger.info("sidecar HMAC écrit", extra={"path": str(path)})
    else:
        digest = _sha256_of_file(path)
        Path(str(path) + _HASH_SUFFIX).write_text(digest, encoding="utf-8")
        logger.info("sidecar SHA-256 écrit", extra={"path": str(path)})


def verify(file_path: Path) -> None:
    """Lève ArtifactIntegrityError si l'artefact est invalide. No-op si désactivé."""
    if not _verification_enabled():
        logger.warning(
            "Vérification d'intégrité DÉSACTIVÉE via %s — chargement non vérifié de %s",
            _VERIFY_ENV, file_path,
        )
        return

    path = Path(file_path)
    key = _signing_key()
    if key:
        sidecar = Path(str(path) + _HMAC_SUFFIX)
        if not sidecar.exists():
            raise ArtifactIntegrityError(
                f"HMAC sidecar absent pour {path}. Refus de charger. "
                f"Set {_VERIFY_ENV}=false pour bypasser (local uniquement)."
            )
        expected = sidecar.read_text(encoding="utf-8").strip()
        actual = _hmac_of_file(path, key)
        if not hmac.compare_digest(expected, actual):
            raise ArtifactIntegrityError(
                f"HMAC mismatch {path} (attendu {expected[:16]}..., reçu {actual[:16]}...)"
            )
        logger.info("HMAC vérifié pour %s", path)
        return

    sidecar = Path(str(path) + _HASH_SUFFIX)
    if not sidecar.exists():
        raise ArtifactIntegrityError(
            f"SHA-256 sidecar absent pour {path}. Refus de charger. "
            f"Set {_VERIFY_ENV}=false pour bypasser (local uniquement)."
        )
    expected = sidecar.read_text(encoding="utf-8").strip()
    actual = _sha256_of_file(path)
    if not hmac.compare_digest(expected, actual):
        raise ArtifactIntegrityError(
            f"SHA-256 mismatch {path} (attendu {expected[:16]}..., reçu {actual[:16]}...)"
        )
    logger.info("SHA-256 vérifié pour %s", path)


def load_with_integrity_check(file_path: Path) -> Any:
    """Vérifie puis charge l'artefact (fail-closed par défaut)."""
    path = Path(file_path)
    verify(path)
    return joblib.load(path)
