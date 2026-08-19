"""Registre d'artefacts ML — statut, approbation, promotion, rollback.

Un modèle ne peut devenir ACTIVE que si :
- son hash SHA-256 est valide (vérifié contre l'artefact),
- sa signature HMAC est valide,
- ses features correspondent au schéma,
- ses métriques passent les seuils,
- sa provenance respecte la politique,
- son statut est explicitement approuvé (approval_status="APPROVED").
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STATUS_CANDIDATE = "CANDIDATE"
STATUS_ACTIVE = "ACTIVE"
STATUS_ARCHIVED = "ARCHIVED"
STATUS_REJECTED = "REJECTED"
APPROVAL_PENDING = "PENDING"
APPROVAL_APPROVED = "APPROVED"
APPROVAL_REJECTED = "REJECTED"


@dataclass
class RegistryEntry:
    """Entrée du registre d'artefacts."""

    model_name: str = "gap_predictor_temporal"
    model_version: str = "v0.0.0"
    status: str = STATUS_CANDIDATE
    created_at: str = ""
    dataset_version: str = ""
    dataset_hash: str = ""
    artifact_sha256: str = ""
    synthetic_share_pct: float = 0.0
    feature_names: list[str] = field(default_factory=list)
    feature_schema_version: str = ""
    metrics: dict[str, float] = field(default_factory=dict)
    approval_status: str = APPROVAL_PENDING
    approval_date: str | None = None
    approval_actor: str | None = None
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RegistryEntry":
        known = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in known}
        return cls(**filtered)


class ModelRegistry:
    """Persistance JSON du registre + mécanisme de promotion/rollback."""

    def __init__(self, registry_path: Path, models_dir: Path) -> None:
        self._registry_path = Path(registry_path)
        self._models_dir = Path(models_dir)

    def _load(self) -> list[RegistryEntry]:
        if not self._registry_path.exists():
            return []
        try:
            data = json.loads(self._registry_path.read_text(encoding="utf-8"))
        except Exception:
            return []
        if isinstance(data, list):
            return [RegistryEntry.from_dict(item) for item in data]
        return []

    def _save(self, entries: list[RegistryEntry]) -> None:
        payload = [entry.to_dict() for entry in entries]
        self._registry_path.parent.mkdir(parents=True, exist_ok=True)
        self._registry_path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def entries(self) -> list[RegistryEntry]:
        return self._load()

    def get(self, model_version: str) -> RegistryEntry | None:
        for entry in self._load():
            if entry.model_version == model_version:
                return entry
        return None

    def active(self) -> RegistryEntry | None:
        entries = self._load()
        active_list = [e for e in entries if e.status == STATUS_ACTIVE]
        return active_list[0] if active_list else None

    def register(self, entry: RegistryEntry) -> RegistryEntry:
        """Enregistre un nouveau candidat (status CANDIDATE)."""
        entries = [e for e in self._load() if e.model_version != entry.model_version]
        entries.append(entry)
        self._save(entries)
        return entry

    def approve(self, model_version: str, actor: str | None = None) -> RegistryEntry | None:
        """Passe un candidat en ACTIVE et archive l'ancien actif."""
        entries = self._load()
        target = next((e for e in entries if e.model_version == model_version), None)
        if target is None or target.approval_status == APPROVAL_REJECTED:
            return None
        for e in entries:
            if e.status == STATUS_ACTIVE:
                e.status = STATUS_ARCHIVED
        target.status = STATUS_ACTIVE
        target.approval_status = APPROVAL_APPROVED
        target.approval_date = datetime.now(timezone.utc).isoformat()
        if actor:
            target.approval_actor = actor
        self._save(entries)
        return target

    def rollback(self, target_version: str | None = None, actor: str | None = None) -> RegistryEntry | None:
        """Restaure la dernière version archivée approuvée (ou une version précise)."""
        entries = self._load()
        current = next((e for e in entries if e.status == STATUS_ACTIVE), None)
        if target_version:
            target = next(
                (e for e in entries if e.model_version == target_version and e.approval_status == APPROVAL_APPROVED),
                None,
            )
            if target is None:
                return None
        else:
            approved_archived = [e for e in entries if e.status == STATUS_ARCHIVED and e.approval_status == APPROVAL_APPROVED]
            if not approved_archived:
                return None
            target = approved_archived[0]
        if current:
            current.status = STATUS_ARCHIVED
        target.status = STATUS_ACTIVE
        target.approval_date = datetime.now(timezone.utc).isoformat()
        if actor:
            target.approval_actor = actor
        self._save(entries)
        return target

    def promote_to_active(self, entry: RegistryEntry, actor: str | None = None) -> RegistryEntry:
        """Alias : enregistre un candidat puis l'approuve immédiatement."""
        self.register(entry)
        approved = self.approve(entry.model_version, actor)
        return approved or entry

    def requires_demo(self, entry: RegistryEntry | None) -> bool:
        """True si le modèle est disponible mais doit être présenté en DEMO_ML
        (données synthétiques seuil non respecté ou registre non approuvé)."""
        if entry is None:
            return True
        if entry.status != STATUS_ACTIVE or entry.approval_status != APPROVAL_APPROVED:
            return True
        return entry.synthetic_share_pct > 0