"""Garde-fous anti-fuite de cible.

La règle: pour chaque ligne du dataset supervisé, la date de l'événement
(target date) doit être STRICTEMENT postérieure à la date de la feature la
plus récente utilisée pour la construire.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import pandas as pd


class TargetLeakageError(ValueError):
    pass


@dataclass
class LeakageCheck:
    checked_rows: int = 0
    leaked_rows: int = 0
    leak_samples: list[dict] | None = None

    @property
    def has_leakage(self) -> bool:
        return self.leaked_rows > 0


class LeakageGuard:
    """Vérifie qu'aucune ligne n'a sa feature la plus récente >= la date cible."""

    # colonnes de dates de features (toutes doivent être <= event_date)
    FEATURE_DATE_COLUMNS = [
        "max_assessment_date",
        "max_activity_date",
        "last_assessment_date",
        "last_training_date",
    ]

    def check(
        self,
        df: pd.DataFrame,
        *,
        event_column: str,
        feature_cutoff_column: str = "feature_cutoff_date",
    ) -> LeakageCheck:
        """Valide feature_cutoff_date < event_date pour toutes les lignes."""
        if event_column not in df.columns:
            raise TargetLeakageError(f"colonne événement manquante: {event_column}")
        if feature_cutoff_column not in df.columns:
            return LeakageCheck(checked_rows=len(df), leaked_rows=0)

        events = pd.to_datetime(df[event_column])
        cutoffs = pd.to_datetime(df[feature_cutoff_column])

        # feature_cutoff doit être <= event_date (données connues au moment de l'événement).
        # Un cutoff STRICTEMENT postérieur à l'événement = fuite de cible.
        leak = events < cutoffs
        check = LeakageCheck(
            checked_rows=len(df),
            leaked_rows=int(leak.sum()),
            leak_samples=[],
        )
        if leak.any():
            samples = df.loc[leak, [event_column, feature_cutoff_column]].head(5)
            check.leak_samples = samples.to_dict("records")
        return check

    def assert_no_leak(self, df: pd.DataFrame, *, event_column: str, feature_cutoff_column: str = "feature_cutoff_date") -> None:
        check = self.check(df, event_column=event_column, feature_cutoff_column=feature_cutoff_column)
        if check.has_leakage:
            raise TargetLeakageError(
                f"fuite de cible détectée sur {check.leaked_rows} lignes "
                f"(feature_cutoff >= event_date). Exemples: {check.leak_samples}"
            )


def max_feature_date_for_row(row: dict) -> date | None:
    dates = []
    for key in ("last_assessment_date", "last_training_date"):
        if row.get(key):
            dates.append(pd.to_datetime(row[key]).date())
    return max(dates) if dates else None
