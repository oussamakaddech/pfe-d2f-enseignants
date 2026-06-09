"""ReportingEngine — analyse descriptive (features 1-4 de la spec).

Contrairement aux moteurs prédictifs (gap/reco/risk), ce moteur agrège des
données déjà présentes (formations, inscriptions, présences) pour produire les
tableaux de bord descriptifs. Les fonctions de calcul (`risque_decrochage_score`,
`tendance`, `score_engagement`...) sont **pures** et donc testables sans base.
"""

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.config import settings
from app.models.db_models import SkillGap, TeacherRiskProfile
from app.services.data_service import DataService

logger = logging.getLogger(__name__)

# Granularité (param API) → unité date_trunc Postgres. Whitelist : aucune valeur
# utilisateur n'atteint le SQL hors de ce mapping (anti-injection).
GRANULARITE_TO_TRUNC = {
    "SEMAINE":   "week",
    "MOIS":      "month",
    "TRIMESTRE": "quarter",
    "ANNEE":     "year",
}


# ── Fonctions de calcul pures (testables) ────────────────────

def risque_decrochage_score(
    mois_sans_formation: int | None,
    nb_competences_declin: int = 0,
    window_mois: int | None = None,
) -> int:
    """Score de risque de décrochage 0-100.

    - Facteur ancienneté : mois sans formation, saturé à `window_mois`
      (configurable, défaut 24). `None` (jamais de formation) → saturation max.
    - Facteur compétences en déclin : +5 points par compétence en régression,
      plafonné à 25 points.
    Pondération : 75 % ancienneté + 25 % déclin compétences.
    """
    window = window_mois if window_mois is not None else settings.inactivite_window_mois
    window = max(window, 1)

    if mois_sans_formation is None:
        anciennete = 1.0
    else:
        anciennete = min(max(mois_sans_formation, 0) / window, 1.0)

    declin = min(nb_competences_declin * 5, 25) / 25.0
    score = anciennete * 75.0 + declin * 25.0
    return int(round(min(score, 100.0)))


def niveau_risque(mois_sans_formation: int | None) -> str:
    """Catégorise pour le code couleur frontend (seuils alignés sur la spec)."""
    if mois_sans_formation is None or mois_sans_formation > 12:
        return "CRITIQUE"   # 🔴 > 12 mois (ou jamais)
    if mois_sans_formation >= 6:
        return "ELEVE"      # 🟠 6-12 mois
    if mois_sans_formation >= 3:
        return "MODERE"     # 🟡 3-6 mois
    return "FAIBLE"


def tendance(serie: list[float]) -> str:
    """HAUSSE / BAISSE / STABLE à partir des 2 dernières valeurs de la série."""
    if len(serie) < 2:
        return "STABLE"
    avant, apres = serie[-2], serie[-1]
    if avant == 0:
        return "HAUSSE" if apres > 0 else "STABLE"
    variation = (apres - avant) / abs(avant)
    if variation > 0.05:
        return "HAUSSE"
    if variation < -0.05:
        return "BAISSE"
    return "STABLE"


def taux_participation(participations: int, nb_enseignants: int, nb_formations: int) -> float:
    """participations / (enseignants × formations) × 100, borné à [0, 100]."""
    denom = nb_enseignants * nb_formations
    if denom <= 0:
        return 0.0
    return round(min(participations / denom * 100.0, 100.0), 1)


def score_engagement(taux_part: float, pct_inactifs: float) -> int:
    """Score 0-100 : 70 % taux de participation, 30 % (100 - % inactifs)."""
    score = taux_part * 0.70 + (100.0 - pct_inactifs) * 0.30
    return int(round(max(0.0, min(score, 100.0))))


# ── Moteur ───────────────────────────────────────────────────

class ReportingEngine:
    def __init__(self, db: Session):
        self.db = db
        self.svc = DataService(db)

    # Feature 1 — Enseignants inactifs (paginé) ----------------
    def enseignants_sans_formation(
        self, mois: int, departement: str | None, up: str | None,
        page: int, size: int,
    ) -> dict[str, Any]:
        rows = self.svc.get_enseignants_sans_formation(mois, departement, up, page, size)
        total = self.svc.count_enseignants_sans_formation(mois, departement, up)

        # Compétences en déclin par enseignant (batch, table analyse locale).
        ens_ids = [r["enseignant_id"] for r in rows]
        declin_map = self._competences_en_declin_par_enseignant(ens_ids)

        items = []
        for r in rows:
            comps = declin_map.get(r["enseignant_id"], [])
            m = r["nombre_mois_depuis_derniere_formation"]
            items.append({
                "enseignantId":                       r["enseignant_id"],
                "nom":                                 r["nom"],
                "prenom":                              r["prenom"],
                "email":                               r["email"],
                "departement":                         r.get("departement_nom"),
                "up":                                  r.get("up_nom"),
                "derniereFormationDate":               (
                    r["derniere_formation_date"].isoformat()
                    if r.get("derniere_formation_date") else None
                ),
                "nombreMoisDepuisDerniereFormation":   m,
                "competencesEnDeclin":                 comps,
                "scoreRisqueDecrochage":               risque_decrochage_score(m, len(comps)),
                "niveauRisque":                        niveau_risque(m),
            })

        return {"total": total, "page": page, "size": size, "items": items}

    def _competences_en_declin_par_enseignant(
        self, enseignant_ids: list[str],
    ) -> dict[str, list[str]]:
        if not enseignant_ids:
            return {}
        rows = (
            self.db.query(SkillGap.enseignant_id, SkillGap.competence_nom)
            .filter(
                SkillGap.enseignant_id.in_(enseignant_ids),
                SkillGap.en_regression.is_(True),
            )
            .all()
        )
        out: dict[str, list[str]] = {}
        for eid, nom in rows:
            if nom and nom not in out.setdefault(eid, []):
                out[eid].append(nom)
        return out

    # Feature 2 — Formations par période -----------------------
    def formations_par_periode(
        self, granularite: str, debut: str, fin: str,
        departement: str | None, up: str | None,
    ) -> dict[str, Any]:
        granul = GRANULARITE_TO_TRUNC[granularite]  # KeyError impossible : validé au routeur
        rows = self.svc.get_formations_par_periode(granul, debut, fin, departement, up)

        periodes = []
        for r in rows:
            nb_form = int(r["nb_formations"] or 0)
            nb_part = int(r["nb_participants"] or 0)
            total_ins = int(r["total_inscriptions"] or 0)
            periodes.append({
                "label":             r["period_start"],
                "nombreFormations":  nb_form,
                "nombreParticipants": nb_part,
                "tauxCompletion":    round(nb_part / total_ins * 100, 1) if total_ins else 0.0,
            })

        total_formations = sum(p["nombreFormations"] for p in periodes)
        total_participants = sum(p["nombreParticipants"] for p in periodes)
        nb_periodes = len(periodes) or 1
        return {
            "granularite":       granularite,
            "periodes":          periodes,
            "totalFormations":   total_formations,
            "totalParticipants": total_participants,
            "moyenneParPeriode": round(total_formations / nb_periodes, 2),
            "tendance":          tendance([p["nombreFormations"] for p in periodes]),
        }

    # Feature 3 — Analyse par UP -------------------------------
    def formations_par_up(self, annee: int | None, departement: str | None) -> list[dict[str, Any]]:
        rows = self.svc.get_formations_par_up(annee, departement)
        top_comps = self._top_competences_index(self.svc.get_top_competences_par_up(annee))
        inactifs = self._inactifs_par_up(departement)

        result = []
        for r in rows:
            up_id = r["up_id"]
            nb_ens = int(r["nombre_enseignants"] or 0)
            nb_form = int(r["nombre_formations_organisees"] or 0)
            nb_part = int(r["nombre_participations"] or 0)
            taux = taux_participation(nb_part, nb_ens, nb_form)
            nb_inactifs = inactifs.get(up_id, 0)
            pct_inactifs = (nb_inactifs / nb_ens * 100.0) if nb_ens else 0.0
            result.append({
                "upId":                       up_id,
                "upNom":                      r["up_nom"],
                "departementNom":             r.get("departement_nom"),
                "nombreEnseignants":          nb_ens,
                "nombreFormationsOrganisees": nb_form,
                "nombreParticipations":       nb_part,
                "tauxParticipation":          taux,
                "competencesLesPlusDemandees": top_comps.get(up_id, [])[:5],
                "enseignantsSansFormation":   nb_inactifs,
                "scoreEngagement":            score_engagement(taux, pct_inactifs),
            })
        result.sort(key=lambda x: x["tauxParticipation"], reverse=True)
        return result

    def _top_competences_index(self, rows: list[dict]) -> dict[str, list[dict]]:
        out: dict[str, list[dict]] = {}
        for r in rows:
            out.setdefault(r["up_id"], []).append({
                "competenceId":  r["competence_id"],
                "competenceNom": r["competence_nom"],
                "nombre":        int(r["nb"] or 0),
            })
        return out

    def _inactifs_par_up(self, departement: str | None) -> dict[str, int]:
        """Compte des inactifs (seuil config) regroupés par UP."""
        mois = settings.seuil_inactivite_mois
        # On réutilise la requête paginée avec une grande taille pour agréger
        # par UP (volume enseignants borné par établissement).
        rows = self.svc.get_enseignants_sans_formation(
            mois, departement, None, page=0, size=settings.export_max_rows,
        )
        out: dict[str, int] = {}
        for r in rows:
            up = r.get("up_id")
            if up:
                out[up] = out.get(up, 0) + 1
        return out

    # Feature 4 — Analyse par département + comparaison radar --
    def formations_par_departement(self, annee: int | None) -> dict[str, Any]:
        rows = self.svc.get_formations_par_departement(annee)
        inactifs = self._inactifs_par_dept()

        departements = []
        radar = []
        for r in rows:
            dept_id = r["departement_id"]
            nb_ens = int(r["nombre_enseignants"] or 0)
            nb_form = int(r["nombre_formations_organisees"] or 0)
            nb_part = int(r["nombre_participations"] or 0)
            taux = taux_participation(nb_part, nb_ens, nb_form)
            nb_inactifs = inactifs.get(dept_id, 0)
            pct_inactifs = round((nb_inactifs / nb_ens * 100.0), 1) if nb_ens else 0.0
            niveau_moy = self._niveau_moyen_dept(dept_id)
            departements.append({
                "departementId":              dept_id,
                "departementNom":             r["departement_nom"],
                "nombreEnseignants":          nb_ens,
                "nombreFormationsOrganisees": nb_form,
                "nombreParticipations":       nb_part,
                "tauxParticipation":          taux,
                "enseignantsSansFormation":   nb_inactifs,
                "pourcentageARisque":         pct_inactifs,
                "niveauCompetenceMoyen":      niveau_moy,
                "scoreEngagement":            score_engagement(taux, pct_inactifs),
            })
            radar.append({
                "departement":          r["departement_nom"],
                "tauxParticipation":    taux,
                "nombreFormations":     nb_form,
                "niveauCompetenceMoyen": niveau_moy,
                "pourcentageARisque":   pct_inactifs,
            })
        departements.sort(key=lambda x: x["tauxParticipation"], reverse=True)
        return {"departements": departements, "comparaisonRadar": radar}

    def _inactifs_par_dept(self) -> dict[str, int]:
        mois = settings.seuil_inactivite_mois
        rows = self.svc.get_enseignants_sans_formation(
            mois, None, None, page=0, size=settings.export_max_rows,
        )
        out: dict[str, int] = {}
        for r in rows:
            dept = r.get("departement_id")
            if dept:
                out[dept] = out.get(dept, 0) + 1
        return out

    def _niveau_moyen_dept(self, dept_id: str) -> float:
        """Niveau de compétence moyen (1-5) des enseignants du dept, via SkillGap."""
        from app.services.data_service import ALL_ENSEIGNANTS_QUERY
        from app.core.db import execute_query
        ens = execute_query(self.db, ALL_ENSEIGNANTS_QUERY, {})
        ens_ids = [e["enseignant_id"] for e in ens if str(e.get("departement_id")) == str(dept_id)]
        if not ens_ids:
            return 0.0
        from sqlalchemy import func
        avg = (
            self.db.query(func.avg(SkillGap.niveau_actuel))
            .filter(SkillGap.enseignant_id.in_(ens_ids))
            .scalar()
        )
        return round(float(avg), 2) if avg is not None else 0.0
