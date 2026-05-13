"""RecommendationEngine — génère recommandations et parcours de formation (Section 2B)."""

import logging
import math
from typing import Any

from sqlalchemy.orm import Session

from app.models.db_models import Recommendation, SkillGap, TrainingPath, TrainingPathItem

logger = logging.getLogger(__name__)

NIVEAU_MAP_INT = {1: "N1", 2: "N2", 3: "N3", 4: "N4", 5: "N5"}


def _score_pertinence(formation: dict, niveau_actuel: int, niveau_requis: int) -> float:
    """Alignement entre ce que comble la formation et le gap réel."""
    niv_cible = int(formation.get("niveau_vise") or formation.get("niveau_cible") or 0)
    if niveau_requis <= niveau_actuel:
        return 0.0
    delta_gap   = niveau_requis - niveau_actuel
    delta_form  = niv_cible - niveau_actuel
    if delta_gap == 0:
        return 0.0
    return max(0.0, min(1.0, 1.0 - abs(delta_form - delta_gap) / 5.0))


def _score_reussite(
    formation_id: int,
    inscriptions: list[dict],
    evaluations: list[dict],
) -> float:
    """Taux de complétion historique × note évaluation."""
    inscrits    = [i for i in inscriptions if i.get("formation_id") == formation_id]
    nb_inscrits = len(inscrits)
    nb_complets = sum(1 for i in inscrits if i.get("etat") in ("APPROVED",))
    taux_hist   = nb_complets / max(nb_inscrits, 1)

    evals_form = [e for e in evaluations if e.get("formation_id") == formation_id]
    if evals_form:
        note_moy = sum(float(e.get("note_globale") or e.get("note", 3)) for e in evals_form) / len(evals_form)
        note_norm = min(1.0, note_moy / 5.0)
    else:
        note_norm = 0.5  # neutre si pas de données

    return round(taux_hist * 0.6 + note_norm * 0.4, 4) if nb_inscrits > 0 else 0.5


def _score_disponibilite(formation: dict) -> float:
    etat = (formation.get("etat_formation") or "").upper()
    ouvert = bool(formation.get("inscriptions_ouvertes") or formation.get("ouverte"))
    score = (1.0 if ouvert else 0.3) * (1.0 if etat in ("PLANIFIE", "EN_COURS", "VISIBLE") else 0.6)
    return round(min(1.0, score), 4)


class RecommendationEngine:
    """Filtre, score et construit les parcours de formations."""

    def __init__(self, db: Session):
        self.db = db

    def generate(
        self,
        enseignant_id: str,
        gaps: list[SkillGap],
        formations: list[dict],
        formation_competences: list[dict],
        inscriptions: list[dict],
        evaluations: list[dict],
        prerequisite_graph: list[dict],
        snapshot_taux_completion: float,
        snapshot_taux_presence: float,
    ) -> tuple[list[Recommendation], list[TrainingPath]]:

        formations_completees = {
            i["formation_id"] for i in inscriptions
            if i.get("etat") == "APPROVED"
        }

        # Index formation_id → formation dict
        formations_index = {f["id_formation"]: f for f in formations}

        # Index competence_id → list[formation]
        comp_to_formations: dict[int, list[dict]] = {}
        for fc in formation_competences:
            cid = fc.get("competence_id")
            if not cid:
                continue
            cid = int(cid)
            fid = int(fc.get("formation_id", 0))
            form = formations_index.get(fid)
            if form:
                entry = {**form, **fc}
                comp_to_formations.setdefault(cid, []).append(entry)

        # Prérequis index: competence_id → list[prereq_id]
        prereq_index: dict[int, list[int]] = {}
        for p in prerequisite_graph:
            tid = int(p.get("target_id", 0))
            pid = int(p.get("prereq_id", 0))
            prereq_index.setdefault(tid, []).append(pid)

        # Facteur d'engagement enseignant (réduit probabilité si faible)
        facteur_engagement = round(
            snapshot_taux_presence   / 100 * 0.5
            + snapshot_taux_completion / 100 * 0.5,
            4,
        )
        facteur_engagement = max(0.3, min(1.0, facteur_engagement))

        all_recommendations: list[Recommendation] = []
        all_paths: list[TrainingPath] = []

        # Trier les gaps par priorité décroissante
        sorted_gaps = sorted(gaps, key=lambda g: float(g.priorite_score), reverse=True)

        for gap in sorted_gaps:
            cid = gap.competence_id
            candidates = self._filter_candidates(
                cid, gap.niveau_actuel, gap.niveau_requis,
                comp_to_formations, formations_completees
            )
            if not candidates:
                continue

            # Scorer
            for f in candidates:
                fid = int(f.get("formation_id") or f.get("id_formation", 0))
                s_pert = _score_pertinence(f, gap.niveau_actuel, gap.niveau_requis)
                s_reus = _score_reussite(fid, inscriptions, evaluations)
                s_disp = _score_disponibilite(f)
                f["_score_pertinence"]  = s_pert
                f["_score_reussite"]    = s_reus
                f["_score_disponibilite"] = s_disp
                f["_score_global"]      = round(
                    s_pert * 0.40 + s_reus * 0.35 + s_disp * 0.25, 4
                )

            candidates.sort(key=lambda x: x["_score_global"], reverse=True)

            # Construire le parcours avec prérequis
            path_items_data = self._build_path(
                candidates, gap, prereq_index,
                comp_to_formations, formations_completees, evaluations, inscriptions
            )
            if not path_items_data:
                continue

            # Probabilité globale du parcours
            proba_globale = self._proba_globale(path_items_data, facteur_engagement)

            # Persister TrainingPath
            path = TrainingPath(
                enseignant_id                = enseignant_id,
                competence_id                = cid,
                competence_nom               = gap.competence_nom,
                niveau_depart                = gap.niveau_actuel,
                niveau_vise                  = gap.niveau_vise,
                nb_formations                = len(path_items_data),
                duree_totale_heures          = sum(
                    it["duree_heures"] for it in path_items_data
                ),
                probabilite_reussite_globale = proba_globale,
                statut                       = "ACTIF",
            )
            self.db.add(path)
            self.db.flush()
            all_paths.append(path)

            for item_data in path_items_data:
                item = TrainingPathItem(
                    training_path_id     = path.id,
                    formation_id         = item_data["formation_id"],
                    formation_titre      = item_data["formation_titre"],
                    formation_type       = item_data.get("type_formation"),
                    duree_heures         = item_data["duree_heures"],
                    rang                 = item_data["rang"],
                    est_obligatoire      = item_data["est_obligatoire"],
                    niveau_avant         = item_data["niveau_avant"],
                    niveau_apres         = item_data["niveau_apres"],
                    prerequis_satisfaits = item_data["prerequis_satisfaits"],
                    deja_suivie          = item_data["deja_suivie"],
                    score_formation      = item_data["score"],
                    justification        = item_data.get("justification"),
                )
                self.db.add(item)

                rec = Recommendation(
                    enseignant_id        = enseignant_id,
                    competence_id        = cid,
                    skill_gap_id         = gap.id,
                    formation_id         = item_data["formation_id"],
                    formation_titre      = item_data["formation_titre"],
                    formation_type       = item_data.get("type_formation"),
                    score_pertinence     = item_data.get("score_pertinence", 0.0),
                    score_taux_reussite  = item_data.get("score_reussite", 0.0),
                    score_disponibilite  = item_data.get("score_disponibilite", 0.0),
                    score_global         = item_data["score"],
                    probabilite_reussite = item_data["proba_reussite"],
                    rang_dans_parcours   = item_data["rang"],
                    est_prerequis        = item_data["est_prerequis"],
                    prerequis_satisfaits = item_data["prerequis_satisfaits"],
                    niveau_apres         = item_data["niveau_apres"],
                    justification        = item_data.get("justification"),
                    facteurs_score       = {
                        "pertinence":   item_data.get("score_pertinence", 0.0),
                        "reussite":     item_data.get("score_reussite", 0.0),
                        "disponibilite":item_data.get("score_disponibilite", 0.0),
                    },
                    training_path_id     = path.id,
                    statut               = "PROPOSEE",
                )
                self.db.add(rec)
                all_recommendations.append(rec)

        self.db.flush()
        logger.info(
            "RecommendationEngine: %d recommandations, %d parcours pour %s",
            len(all_recommendations), len(all_paths), enseignant_id,
        )
        return all_recommendations, all_paths

    # ── Helpers ─────────────────────────────────────────────

    def _filter_candidates(
        self,
        competence_id: int,
        niveau_actuel: int,
        niveau_requis: int,
        comp_to_formations: dict,
        formations_completees: set,
    ) -> list[dict]:
        candidates = []
        for f in comp_to_formations.get(competence_id, []):
            fid  = int(f.get("formation_id") or f.get("id_formation", 0))
            nprq = int(f.get("niveau_prerequis") or f.get("niveau_cible") or 0)
            nvis = int(f.get("niveau_vise") or f.get("niveau_cible") or 0)
            etat = (f.get("etat_formation") or "").upper()

            if etat == "ANNULE":
                continue
            if fid in formations_completees:
                continue
            if nprq > niveau_actuel:
                continue
            if nvis <= niveau_actuel:
                continue
            candidates.append(f)
        return candidates

    def _build_path(
        self,
        candidates: list[dict],
        gap: SkillGap,
        prereq_index: dict,
        comp_to_formations: dict,
        formations_completees: set,
        evaluations: list[dict],
        inscriptions: list[dict],
    ) -> list[dict]:
        items = []
        rang  = 1

        # Ajouter d'abord les formations prérequis manquants
        for prereq_cid in prereq_index.get(gap.competence_id, [])[:2]:
            prereq_candidates = self._filter_candidates(
                prereq_cid, 0, 3, comp_to_formations, formations_completees
            )
            if prereq_candidates:
                best = max(prereq_candidates, key=lambda x: x.get("_score_global", 0.0))
                fid  = int(best.get("formation_id") or best.get("id_formation", 0))
                s_r  = _score_reussite(fid, inscriptions, evaluations)
                items.append(self._make_item(best, rang, True, 0, 1, s_r, est_prereq=True))
                rang += 1

        # Ajouter les formations principales (max 3)
        for f in candidates[:3]:
            fid = int(f.get("formation_id") or f.get("id_formation", 0))
            s_r = _score_reussite(fid, inscriptions, evaluations)
            niv_avant = int(gap.niveau_actuel) + (rang - 1)
            niv_apres = min(5, niv_avant + 1)
            items.append(self._make_item(f, rang, True, niv_avant, niv_apres, s_r))
            rang += 1

        return items

    def _make_item(
        self, f: dict, rang: int, obligatoire: bool,
        niv_avant: int, niv_apres: int, score_reussite: float,
        est_prereq: bool = False,
    ) -> dict:
        score_g = float(f.get("_score_global", 0.5))
        proba   = round(min(0.95, 0.55 + score_g * 0.3 + score_reussite * 0.15), 4)
        duree   = int(f.get("charge_horaire_global") or f.get("duree_formation") or 20)
        return {
            "formation_id":       int(f.get("formation_id") or f.get("id_formation", 0)),
            "formation_titre":    f.get("titre_formation", "Formation"),
            "type_formation":     f.get("type_formation"),
            "duree_heures":       duree,
            "rang":               rang,
            "est_obligatoire":    obligatoire,
            "niveau_avant":       niv_avant,
            "niveau_apres":       niv_apres,
            "prerequis_satisfaits": True,
            "deja_suivie":        False,
            "score":              score_g,
            "proba_reussite":     proba,
            "score_pertinence":   float(f.get("_score_pertinence", 0.0)),
            "score_reussite":     score_reussite,
            "score_disponibilite": float(f.get("_score_disponibilite", 0.0)),
            "est_prerequis":      est_prereq,
            "justification":      (
                f"Formation prérequis" if est_prereq
                else f"Score global {round(score_g, 2)}"
            ),
        }

    def _proba_globale(self, items: list[dict], facteur_engagement: float) -> float:
        if not items:
            return 0.0
        produit = math.prod(it["proba_reussite"] for it in items)
        return round(min(0.95, produit * facteur_engagement), 4)
