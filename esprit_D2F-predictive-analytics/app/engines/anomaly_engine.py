"""AnomalyEngine — détection d'anomalies et génération d'alertes.

Nouvelle fonctionnalité (PFE) : détecte des comportements anormaux chez un
enseignant (ou à l'échelle d'un département) :
- chute soudaine du niveau moyen de compétence entre deux snapshots ;
- pic d'inactivité (aucune formation depuis > seuil) ;
- explosion soudaine du nombre de gaps critiques ;
- régression d'une compétence déjà acquise.

Chaque anomalie génère un ``AlertEvent`` de type ``ANOMALIE`` (idempotent :
on ne duplique pas une alerte ouverte récente pour la même clé). Tous les
seuils proviennent de ``settings``.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.core.observability import safe_kpi
from app.models.db_models import AlertEvent, FeatureSnapshot, SkillGap

logger = logging.getLogger(__name__)

ANOMALY_TYPE = "ANOMALIE"
# Fenêtre d'idempotence : ne pas recréer une alerte du même type/clé sous N jours.
_DEDUP_DAYS = 7


class AnomalyEngine:
    """Détecte les anomalies et émet les alertes correspondantes."""

    def __init__(self, db: Session):
        self.db = db

    def _safe(self, name: str, fn, default: Any) -> Any:
        return safe_kpi(name, fn, default, logger)

    # ── Idempotence ────────────────────────────────────────
    def _already_open(self, enseignant_id: str, cle: str) -> bool:
        cutoff = datetime.now(timezone.utc) - timedelta(days=_DEDUP_DAYS)
        existing = (
            self.db.query(AlertEvent)
            .filter(
                AlertEvent.type_alerte == ANOMALY_TYPE,
                AlertEvent.enseignant_id == enseignant_id,
                AlertEvent.details_json["cle"].astext == cle,
                AlertEvent.statut == "NOUVELLE",
                AlertEvent.created_at >= cutoff,
            )
            .first()
        )
        return existing is not None

    def _emit(
        self,
        enseignant_id: str,
        departement_id: str | None,
        competence_id: int | None,
        severite: str,
        titre: str,
        message: str,
        cle: str,
        details: dict[str, Any],
    ) -> AlertEvent | None:
        if self._already_open(enseignant_id, cle):
            return None
        alert = AlertEvent(
            type_alerte=ANOMALY_TYPE,
            cible_type="INDIVIDUEL",
            enseignant_id=enseignant_id,
            departement_id=departement_id,
            competence_id=competence_id,
            severite=severite,
            titre=titre,
            message=message,
            details_json={**details, "cle": cle},
            statut="NOUVELLE",
        )
        self.db.add(alert)
        self.db.flush()
        return alert

    # ── Détecteurs ─────────────────────────────────────────
    def _detect_level_drop(self, enseignant_id: str, dept: str | None) -> list[AlertEvent]:
        """Chute soudaine du niveau moyen entre les 2 derniers snapshots."""
        snaps = (
            self.db.query(FeatureSnapshot)
            .filter(FeatureSnapshot.enseignant_id == enseignant_id)
            .order_by(FeatureSnapshot.snapshot_date.desc())
            .limit(2)
            .all()
        )
        if len(snaps) < 2:
            return []
        recent, prev = snaps[0], snaps[1]
        r0 = float(recent.niveau_moyen_competences or 0.0)
        r1 = float(prev.niveau_moyen_competences or 0.0)
        drop = r1 - r0
        seuil = settings.anomaly_level_drop_min
        if drop >= seuil:
            a = self._emit(
                enseignant_id, dept, None, "CRITICAL",
                "Chute soudaine du niveau de compétence",
                f"Le niveau moyen a chuté de {drop:.2f} points "
                f"({r1:.2f} → {r0:.2f}) entre deux snapshots.",
                "level_drop",
                {"niveau_precedent": r1, "niveau_recent": r0, "chute": round(drop, 3)},
            )
            return [a] if a else []
        return []

    def _detect_inactivity_spike(self, enseignant_id: str, dept: str | None) -> list[AlertEvent]:
        """Pic d'inactivité : aucune formation depuis > seuil_inactivite_mois."""
        profil = self.db.execute(
            __import__("sqlalchemy").text(
                """
                SELECT EXTRACT(DAY FROM CURRENT_DATE - MAX(i.date_demande))::INT
                FROM inscriptions i
                WHERE i.enseignant_id = :e
                """
            ),
            {"e": enseignant_id},
        ).fetchone()
        if not profil or profil[0] is None:
            return []
        days = int(profil[0])
        mois = days // 30
        if mois >= settings.seuil_inactivite_mois:
            a = self._emit(
                enseignant_id, dept, None, "WARNING",
                "Inactivité formation prolongée",
                f"Aucune formation suivie depuis {mois} mois "
                f"(seuil : {settings.seuil_inactivite_mois} mois).",
                "inactivity_spike",
                {"mois_inactivite": mois},
            )
            return [a] if a else []
        return []

    def _detect_gap_surge(self, enseignant_id: str, dept: str | None) -> list[AlertEvent]:
        """Explosion soudaine du nb de gaps critiques vs historique."""
        counts = (
            self.db.query(
                func.count(SkillGap.id)
            )
            .filter(
                SkillGap.enseignant_id == enseignant_id,
                SkillGap.niveau_urgence == "CRITIQUE",
            )
            .scalar()
        )
        nb = int(counts or 0)
        if nb >= settings.anomaly_gap_surge_min:
            a = self._emit(
                enseignant_id, dept, None, "WARNING",
                "Pic de gaps critiques",
                f"{nb} gaps critiques détectés (seuil d'anomalie : "
                f"{settings.anomaly_gap_surge_min}).",
                "gap_surge",
                {"nb_gaps_critiques": nb},
            )
            return [a] if a else []
        return []

    def _detect_regression(self, enseignant_id: str, dept: str | None) -> list[AlertEvent]:
        """Régression d'une compétence déjà acquise (niveau requis atteint)."""
        gaps = (
            self.db.query(SkillGap)
            .filter(
                SkillGap.enseignant_id == enseignant_id,
                SkillGap.en_regression.is_(True),
            )
            .all()
        )
        out: list[AlertEvent] = []
        for g in gaps:
            a = self._emit(
                enseignant_id, dept, int(g.competence_id), "INFO",
                f"Régression compétence : {g.competence_nom}",
                f"La compétence « {g.competence_nom} » est en régression "
                f"(niveau actuel {g.niveau_actuel}).",
                f"regression_{g.competence_id}",
                {"competence_id": g.competence_id, "niveau_actuel": g.niveau_actuel},
            )
            if a:
                out.append(a)
        return out

    # ── API principale ─────────────────────────────────────
    def detect_for_teacher(self, enseignant_id: str, departement_id: str | None = None) -> dict[str, Any]:
        """Lance tous les détecteurs pour un enseignant et persiste les alertes."""
        anomalies: list[dict[str, Any]] = []
        emitted: list[AlertEvent] = []
        for fn in (
            self._detect_level_drop,
            self._detect_inactivity_spike,
            self._detect_gap_surge,
            self._detect_regression,
        ):
            try:
                alerts = fn(enseignant_id, departement_id)
                emitted.extend(alerts)
            except Exception as exc:  # noqa: BLE001 — un détecteur ne doit pas tout bloquer
                logger.warning("Détecteur %s en échec : %s", fn.__name__, exc)

        for a in emitted:
            anomalies.append({
                "type": a.type_alerte,
                "severite": a.severite,
                "titre": a.titre,
                "message": a.message,
                "competence_id": a.competence_id,
            })
        return {
            "enseignant_id": enseignant_id,
            "nb_anomalies": len(anomalies),
            "anomalies": anomalies,
        }

    def detect_department(self, departement_id: str) -> dict[str, Any]:
        """Détecte les anomalies pour tous les enseignants d'un département."""
        rows = self.db.execute(
            __import__("sqlalchemy").text(
                "SELECT id FROM enseignants WHERE dept_id = :d AND deleted_at IS NULL"
            ),
            {"d": departement_id},
        ).fetchall()
        total = 0
        details: list[dict[str, Any]] = []
        for (eid,) in rows:
            res = self.detect_for_teacher(str(eid), departement_id)
            total += res["nb_anomalies"]
            if res["nb_anomalies"]:
                details.append(res)
        return {
            "departement_id": departement_id,
            "nb_enseignants_scannes": len(rows),
            "nb_anomalies": total,
            "details": details,
        }
