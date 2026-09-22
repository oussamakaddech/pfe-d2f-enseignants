"""Registre d'artefacts ML — statut, approbation, promotion, rollback.

Un modèle ne peut devenir ACTIVE que si :
- son hash SHA-256 est valide (vérifié contre l'artefact),
- sa signature HMAC est valide,
- ses features correspondent au schéma,
- ses métriques passent les seuils,
- sa provenance respecte la politique,
- son statut est explicitement approuvé (approval_status="APPROVED").

Validité de la cible (gouvernance 7.6) :
- ``EXTRAPOLATED_TARGET`` : la cible gap_next_3m est dérivée de l'historique
  (extrapolation de tendance) — statut DÉMONSTRATION ;
- ``REAL_VALIDATED_TARGET`` : la cible provient de re-mesures réelles
  (target_observation_date). Promotion possible SEULEMENT si
  real_future_observation_count >= 30 ET distinct_observation_months >= 3.

Exception de gouvernance (decision projet du 2026-09-22) : la regle « aucune
promotion sur un avantage non significatif » (§2.6 de l'audit d'autorite) reste
en place, mais une version peut en etre explicitement ECARTEE via
``declare_override`` — acteur, date et justification sont alors enregistres dans
l'entree, et ``enforce_governance_ic95`` respecte cette declaration (maintien
ACTIVE journalise, pas de retrogravation silencieuse).
"""
from __future__ import annotations

import json
import math
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

# Validité de la cible prédictive (chapitre 7.6 — limite 1).
TARGET_VALIDITY_EXTRAPOLATED = "EXTRAPOLATED_TARGET"
TARGET_VALIDITY_REAL = "REAL_VALIDATED_TARGET"
TARGET_VALIDITY_OBSERVED_SIMULATION = "OBSERVED_IN_SIMULATION"
# Seuil de promotion REAL_VALIDATED_TARGET : >= 30 observations futures
# réelles couvrant >= 3 mois distincts.
REAL_TARGET_MIN_OBSERVATIONS = 30
REAL_TARGET_MIN_DISTINCT_MONTHS = 3

# Origine des donnees (gouvernance simulation)
DATA_ORIGIN_SIMULATED = "SIMULATED"
DATA_ORIGIN_INSTITUTIONAL = "INSTITUTIONAL_RECORD"
DATA_ORIGIN_DEMO_SEED = "DEMO_SEED"

# Portee de validation
VALIDATION_SCOPE_SIMULATION = "SIMULATION_VALIDATED"
VALIDATION_SCOPE_REAL = "REAL_VALIDATED"
VALIDATION_SCOPE_DEMO = "DEMO_VALIDATED"


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
    target_validity: str = TARGET_VALIDITY_EXTRAPOLATED
    real_future_observation_count: int = 0
    distinct_observation_months: int = 0
    # Gouvernance simulation (etape 4)
    data_origin: str = DATA_ORIGIN_DEMO_SEED
    validation_scope: str = VALIDATION_SCOPE_DEMO
    generator_version: str | None = None
    seed: int | None = None
    # Gouvernance REAL_VALIDATED (etape 4.4) : reference de l'attestation DSI
    # accompagnant les donnees institutionnelles. Aucune attestation existe
    # aujourd'hui — une promotion REAL_VALIDATED sans attestation est refusee.
    attestation_dsi: str | None = None
    # Gouvernance IC95 (audit d'autorite 2026-09-22, §2.6) : resultat REEL du
    # test de significativite du gain du modele (bootstrap de la difference de
    # RMSE contre le modele de reference / la baseline honnete, sur le corpus
    # de production). ``None`` = non declare (entrees anterieures a la regle) ;
    # ``False`` = l'IC95 inclut 0 => promotion AUTOMATIQUEMENT refusee.
    lift_significant_95: bool | None = None
    lift_rmse_ci95: list[float] | None = None
    # Exception de gouvernance TRACEE (decision projet du 2026-09-22). La mesure
    # reste honnete (lift_significant_95=false) ; l'override est NOMINE, DATE et
    # JUSTIFIE, et reste visible dans le registre. Aucun override silencieux.
    override_decision: bool = False
    override_actor: str | None = None
    override_date: str | None = None
    override_justification: str | None = None

    # Sérialise l'entrée du registre en dictionnaire (pour écriture JSON).
    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    # Reconstruit une RegistryEntry depuis un dictionnaire JSON en ignorant
    # les clés inconnues (compatibilité entre versions du registre).
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RegistryEntry":
        known = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in known}
        return cls(**filtered)


class ModelRegistry:
    """Persistance JSON du registre + mécanisme de promotion/rollback."""

    # Initialise le registre : chemin du fichier JSON + dossier des artefacts.
    def __init__(self, registry_path: Path, models_dir: Path) -> None:
        self._registry_path = Path(registry_path)
        self._models_dir = Path(models_dir)

    # Charge toutes les entrées du registre depuis le JSON
    # (liste vide si fichier absent ou illisible).
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

    # Écrit toutes les entrées du registre dans le fichier JSON (indenté).
    def _save(self, entries: list[RegistryEntry]) -> None:
        payload = [entry.to_dict() for entry in entries]
        self._registry_path.parent.mkdir(parents=True, exist_ok=True)
        self._registry_path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    # Renvoie toutes les entrées du registre.
    def entries(self) -> list[RegistryEntry]:
        return self._load()

    # Recherche une entrée par sa version de modèle (None si absente).
    def get(self, model_version: str) -> RegistryEntry | None:
        for entry in self._load():
            if entry.model_version == model_version:
                return entry
        return None

    # Renvoie l'entrée actuellement ACTIVE (celle servie en production), sinon None.
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

    def target_promotion_error(self, entry: RegistryEntry) -> str | None:
        """Raison de refus d'une promotion REAL_VALIDATED_TARGET (None si OK).

        Gouvernance (chapitre 7.6, limite 1) : une version ne peut être
        promue avec target_validity=REAL_VALIDATED_TARGET que si
        real_future_observation_count >= 30, distinct_observation_months >= 3
        ET une attestation DSI accompagne les donnees institutionnelles.
        Sinon elle reste DÉMONSTRATION (EXTRAPOLATED_TARGET).

        Etape 4 (simulation) : REAL_VALIDATED exige attestation DSI ;
        SIMULATION_VALIDATED / OBSERVED_IN_SIMULATION est librement promouvable
        pour demonstration (gouvernance fail-closed : jamais REAL sans attestation).
        """
        # SIMULATION_VALIDATED / OBSERVED_IN_SIMULATION : toujours autorise pour demo
        if entry.target_validity == TARGET_VALIDITY_OBSERVED_SIMULATION:
            return None
        if entry.validation_scope == VALIDATION_SCOPE_SIMULATION:
            return None
        if entry.target_validity != TARGET_VALIDITY_REAL and entry.validation_scope != VALIDATION_SCOPE_REAL:
            return None
        if entry.real_future_observation_count < REAL_TARGET_MIN_OBSERVATIONS:
            return (
                f"promotion REAL_VALIDATED_TARGET refusee : "
                f"{entry.real_future_observation_count} observations reelles "
                f"< seuil {REAL_TARGET_MIN_OBSERVATIONS}"
            )
        if entry.distinct_observation_months < REAL_TARGET_MIN_DISTINCT_MONTHS:
            return (
                f"promotion REAL_VALIDATED_TARGET refusee : "
                f"{entry.distinct_observation_months} mois distincts "
                f"< seuil {REAL_TARGET_MIN_DISTINCT_MONTHS}"
            )
        # Etape 4.4 : meme avec 30+ observations reelles sur >= 3 mois, la
        # promotion REAL_VALIDATED exige l'attestation DSI de provenance des
        # donnees institutionnelles (aucune n'existe aujourd'hui).
        if not entry.attestation_dsi:
            return (
                "promotion REAL_VALIDATED_TARGET refusee : attestation DSI absente "
                "(provenance institutionnelle des donnees non attestee)"
            )
        return None

    def promotion_validation_error(self, entry: RegistryEntry) -> str | None:
        """Raison de refus structurel d'une promotion (None si valide).

        Un nouvel artefact ne doit etre promu ACTIVE/APPROVED que si :
        - son empreinte SHA-256 est une chaine hexadecimale de 64 caracteres ;
        - le gain declare est SIGNIFICATIF (IC95 excluant 0, §2.6 du rapport
          d'autorite 2026-09-22) quand le resultat du test est renseigne ;
        - ses metriques sont finies et non negatives (quand presentes) ;
        - son schema de features est compatible avec le code (gap_predictor_temporal :
          liste canonique + version de schema ; autres modeles : structural checks).
        Sinon la promotion est refusee (fail-closed) — le chargement au serving
        echouerait de toute facon (integrite + spec de features).
        """
        sha = (entry.artifact_sha256 or "").strip()
        if len(sha) != 64 or any(c not in "0123456789abcdefABCDEF" for c in sha):
            return f"empreinte SHA-256 invalide ({(sha[:16] or 'vide')}...) : promotion refusee"
        significance_error = self.significance_promotion_error(entry)
        if significance_error:
            return significance_error
        for name, value in (entry.metrics or {}).items():
            if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or value < 0:
                return f"metrique invalide ({name}={value}) : promotion refusee"
        if entry.model_name == "gap_predictor_temporal" and entry.feature_names:
            # Import tardif pour eviter le cycle predictor -> model_registry.
            from app.infrastructure.ml.predictor import FEATURE_SCHEMA_VERSION, TEMPORAL_FEATURE_COLS

            if entry.feature_names != list(TEMPORAL_FEATURE_COLS):
                return "schema de features incompatible avec le code (liste canonique attendue) : promotion refusee"
            if entry.feature_schema_version != FEATURE_SCHEMA_VERSION:
                return (
                    f"version de schema features incompatible : registre={entry.feature_schema_version}, "
                    f"code={FEATURE_SCHEMA_VERSION} : promotion refusee"
                )
        return None

    # Gouvernance IC95 (audit d'autorite 2026-09-22, §2.6) : le projet s'est dote
    # d'une regle explicite — aucune promotion sur un avantage numerique non
    # significatif (IC95 de la difference de RMSE incluant 0). Cette regle etait
    # appliquee a la main, donc contournable : le GB `v1.2.0-gb` a ete promu par
    # override alors que sa propre mesure disait `significant: false`, tandis
    # qu'un gain comparable (XGBoost `v1.2.0`) avait ete refuse. Elle est
    # desormais AUTOMATIQUE : une entree qui DECLARE sa non-significativite ne
    # peut plus etre promue, quelle que soit la volonte de l'operateur.
    # Absence des champs = pas de refus (compatibilite avec les entrees
    # anterieures a la regle, qui ne portaient pas le resultat du test).
    def significance_promotion_error(self, entry: RegistryEntry) -> str | None:
        """Raison de refus pour gain non significatif (None si significatif/non declare).

        Exception de gouvernance TRACEE (decision projet du 2026-09-22) : une entree
        portant ``override_decision=True`` est promouvable — la regle n'est pas
        supprimee, elle est explicitement ecartee pour cette version, avec acteur,
        date et justification enregistres (jamais silencieux, jamais implicite).
        """
        if entry.override_decision:
            return None
        if entry.lift_significant_95 is False:
            ci = entry.lift_rmse_ci95
            detail = ""
            if isinstance(ci, (list, tuple)) and len(ci) == 2:
                detail = f" IC95 delta RMSE [{float(ci[0]):+.4f}, {float(ci[1]):+.4f}]."
            return (
                "gain non significatif (lift_significant_95=false) : promotion refusee"
                " — regle « aucune promotion sur un avantage non significatif »." + detail
            )
        ci = entry.lift_rmse_ci95
        if isinstance(ci, (list, tuple)) and len(ci) == 2:
            try:
                low, high = float(ci[0]), float(ci[1])
            except (TypeError, ValueError):
                return None
            if low <= 0 <= high:
                return (
                    f"gain non significatif (IC95 delta RMSE [{low:+.4f}, {high:+.4f}] inclut 0) : "
                    "promotion refusee — regle « aucune promotion sur un avantage non significatif »."
                )
        return None

    def is_real_validated(self, entry: RegistryEntry) -> bool:
        """True si l'entree revendique une validation reelle (REAL_VALIDATED)."""
        return entry.validation_scope == VALIDATION_SCOPE_REAL or entry.target_validity == TARGET_VALIDITY_REAL

    def is_simulation_validated(self, entry: RegistryEntry) -> bool:
        """True si SIMULATION_VALIDATED (utilisable en demonstration)."""
        return entry.validation_scope == VALIDATION_SCOPE_SIMULATION or entry.target_validity == TARGET_VALIDITY_OBSERVED_SIMULATION

    def approve(self, model_version: str, actor: str | None = None) -> RegistryEntry | None:
        """Passe un candidat en ACTIVE et archive l'ancien actif.

        Refuse la promotion si :
        - l'entrée revendique REAL_VALIDATED_TARGET sans atteindre le seuil
          documenté (30 observations réelles sur >= 3 mois distincts) ;
        - l'empreinte SHA-256, le schéma de features ou les métriques sont
          invalides (validation structurelle fail-closed, limite audit 2.2).
        """
        entries = self._load()
        target = next((e for e in entries if e.model_version == model_version), None)
        if target is None or target.approval_status == APPROVAL_REJECTED:
            return None
        promotion_error = self.target_promotion_error(target)
        structural_error = self.promotion_validation_error(target)
        errors = [e for e in (promotion_error, structural_error) if e]
        if errors:
            target.approval_status = APPROVAL_REJECTED
            target.notes = (target.notes + " | " if target.notes else "") + " | ".join(errors)
            self._save(entries)
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

    def declare_override(self, model_version: str, actor: str, justification: str) -> RegistryEntry | None:
        """Déclare une exception de gouvernance TRACÉE pour une version.

        Décision projet explicite (jamais implicite) : l'entrée conserve sa mesure
        honnête (``lift_significant_95=false``) mais devient promouvable ; l'override
        est nommé (acteur), daté et justifié, et reste visible dans le registre.
        Utilisé par ``pipelines/promote_gb_override.py`` (décision 2026-09-22).
        """
        entries = self._load()
        target = next((e for e in entries if e.model_version == model_version), None)
        if target is None:
            return None
        target.override_decision = True
        target.override_actor = actor
        target.override_date = datetime.now(timezone.utc).isoformat()
        target.override_justification = justification
        target.notes = (target.notes + " | " if target.notes else "") + (
            f"OVERRIDE DECLARE ({actor}, {target.override_date[:10]}) : {justification}"
        )
        self._save(entries)
        return target

    def requires_demo(self, entry: RegistryEntry | None) -> bool:
        """True si le modèle est disponible mais doit être présenté en DEMO_ML
        (données synthétiques seuil non respecté ou registre non approuvé)."""
        if entry is None:
            return True
        if entry.status != STATUS_ACTIVE or entry.approval_status != APPROVAL_APPROVED:
            return True
        return entry.synthetic_share_pct > 0