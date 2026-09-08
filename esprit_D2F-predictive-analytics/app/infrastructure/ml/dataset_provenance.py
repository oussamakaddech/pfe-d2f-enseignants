"""Validation robuste de la provenance des données d'entraînement.

Le pourcentage synthétique est TOUJOURS calculé depuis les lignes du dataset
(colonne ``is_synthetic``), jamais lu depuis une variable arbitraire.

Colonnes attendues :
    source_type, source_id, is_synthetic, created_at, dataset_version
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

PROVENANCE_COLUMNS = [
    "source_type",
    "source_id",
    "is_synthetic",
    "created_at",
    "dataset_version",
]


@dataclass
class DatasetProvenanceReport:
    """Rapport de provenance calculé réellement depuis les lignes du dataset."""

    total_rows: int = 0
    real_rows: int = 0
    synthetic_rows: int = 0
    synthetic_share_pct: float = 0.0
    real_share_pct: float = 0.0
    dataset_version: str | None = None
    min_date: str | None = None
    max_date: str | None = None
    target_mean: float | None = None
    target_distribution: dict[str, int] = field(default_factory=dict)
    missing_values: dict[str, int] = field(default_factory=dict)
    duplicates: int = 0
    teachers_distribution: dict[str, int] = field(default_factory=dict)
    competencies_distribution: dict[str, int] = field(default_factory=dict)
    dataset_hash: str = ""
    errors: list[str] = field(default_factory=list)

    # Sérialise le rapport de provenance en dictionnaire prêt pour l'API/JSON.
    def to_dict(self) -> dict[str, Any]:
        return {
            "total_rows": self.total_rows,
            "real_rows": self.real_rows,
            "synthetic_rows": self.synthetic_rows,
            "synthetic_share_pct": round(self.synthetic_share_pct, 2),
            "real_share_pct": round(self.real_share_pct, 2),
            "dataset_version": self.dataset_version,
            "min_date": self.min_date,
            "max_date": self.max_date,
            "target_mean": self.target_mean,
            "target_distribution": self.target_distribution,
            "missing_values": self.missing_values,
            "duplicates": self.duplicates,
            "teachers_distribution": self.teachers_distribution,
            "competencies_distribution": self.competencies_distribution,
            "dataset_hash": self.dataset_hash,
            "errors": self.errors,
        }

    def is_valid_for_production(self, tolerance_pct: float, require_real: bool = True, min_real_rows: int = 50) -> bool:
        """Décision de production basée sur la provenance réelle et le seuil."""
        if self.total_rows == 0:
            return False
        if self.synthetic_share_pct > tolerance_pct:
            return False
        if require_real and self.real_rows < min_real_rows:
            return False
        return True


def file_hash(df: pd.DataFrame) -> str:
    """SHA-256 stable du contenu du dataset (tri des lignes + index r�initialis�).

    Deux normalisations OBLIGATOIRES pour un hash identique sur toutes les
    plateformes :
    - lineterminator="\\n" : to_csv() suit sinon l'os.linesep (CRLF sur Windows,
      LF sur Linux) et le hash diff�re entre CI et local pour un m�me dataset ;
    - kind="stable" : ordonnancement d�terministe des lignes dupliqu�es.
    """
    if df is None or df.empty:
        return hashlib.sha256(b"").hexdigest()
    canonical = (
        df.copy()
        .sort_values(by=df.columns.tolist(), kind="stable")
        .reset_index(drop=True)
    )
    payload = canonical.to_csv(index=False, lineterminator="\n").encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


# Convertit une valeur "is_synthetic" hétérogène (0/1, "true"/"vrai"…) en booléen strict.
def _coerce_bool(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in ("1", "true", "yes", "oui", "vrai")


def compute_provenance(df: pd.DataFrame, dataset_version: str | None = None) -> DatasetProvenanceReport:
    """Calcule la provenance depuis les lignes réelles du dataset.

    Si les colonnes de provenance sont absentes, la politique est fail-closed :
    toutes les lignes sont considérées non vérifiées (erreur listée), et la
    provenance est invalide pour PRODUCTION_ML.
    """
    report = DatasetProvenanceReport()
    if df is None or df.empty:
        report.errors.append("dataset vide")
        return report

    report.total_rows = len(df)
    report.dataset_version = dataset_version or "unknown"

    missing_prov = [c for c in PROVENANCE_COLUMNS if c not in df.columns]
    if missing_prov:
        report.errors.append(f"colonnes provenance absentes : {missing_prov}")
        report.dataset_hash = file_hash(df)
        _fill_stats(df, report)
        return report

    df = df.copy()
    df["is_synthetic"] = df["is_synthetic"].apply(_coerce_bool)
    report.real_rows = int((~df["is_synthetic"]).sum())
    report.synthetic_rows = int(df["is_synthetic"].sum())
    report.synthetic_share_pct = round(100.0 * report.synthetic_rows / max(1, report.total_rows), 2)
    report.real_share_pct = round(100.0 - report.synthetic_share_pct, 2)
    report.dataset_hash = file_hash(df)

    dates = df["created_at"].dropna().astype(str)
    if not dates.empty:
        report.min_date = dates.min()
        report.max_date = dates.max()

    _fill_stats(df, report)
    return report


# Remplit les statistiques du rapport : distribution de la cible gap_next_3m,
# valeurs manquantes, doublons, distributions par enseignant et par compétence.
def _fill_stats(df: pd.DataFrame, report: DatasetProvenanceReport) -> None:
    if "gap_next_3m" in df.columns:
        target = pd.to_numeric(df["gap_next_3m"], errors="coerce")
        report.target_mean = float(target.mean()) if target.notna().any() else None
        report.target_distribution = target.value_counts().sort_index().astype(int).to_dict()
    else:
        report.errors.append("colonne cible gap_next_3m absente")

    report.missing_values = {col: int(df[col].isna().sum()) for col in df.columns if int(df[col].isna().sum()) > 0}

    dup_cols = [c for c in ("teacher_id", "competence_id", "competence_code", "date_t") if c in df.columns]
    if dup_cols:
        report.duplicates = int(df.duplicated(subset=dup_cols).sum())

    if "teacher_id" in df.columns:
        report.teachers_distribution = df["teacher_id"].value_counts().astype(int).to_dict()

    if "competence_id" in df.columns:
        report.competencies_distribution = df["competence_id"].value_counts().astype(int).to_dict()


def provenance_from_csv(
    path: Path,
    dataset_version: str | None = None,
    required_columns: list[str] | None = None,
) -> DatasetProvenanceReport:
    """Charge un CSV, vérifie les colonnes attendues et calcule la provenance."""
    path = Path(path)
    if not path.exists():
        report = DatasetProvenanceReport()
        report.errors.append(f"fichier introuvable : {path}")
        return report
    df = pd.read_csv(path)
    if required_columns:
        missing = [c for c in required_columns if c not in df.columns]
        if missing:
            report = DatasetProvenanceReport()
            report.errors.append(f"colonnes requises absentes : {missing}")
            report.dataset_hash = file_hash(df)
            return report
    return compute_provenance(df, dataset_version)