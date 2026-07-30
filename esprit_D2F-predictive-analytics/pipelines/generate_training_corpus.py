"""Corpus d'entraînement temporel pour le gap predictor.

Génère 5000 lignes : (teacher, competency, period).
Chaque ligne contient l'historique temporel (t-3..t) pour anticiper
le gap à 3 mois (gap_next_3m).

Structure :
  - teacher_profile : ensemble des données de l'enseignant
  - competency_history : niveaux actuels sur 4 périodes passées (t-3, t-2, t-1, t)
  - target : gap_predicted (gap_next_3m) = max(0, required_level_t+3 - current_level_t+3)

Le dataset est généré avec seed=42 pour reproductibilité.
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)
random.seed(RANDOM_SEED)

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"

# Lire le dataset maître (source de vérité)
teachers_df = pd.read_csv(CLEAN_DIR / "teachers.csv")
competencies_df = pd.read_csv(CLEAN_DIR / "teacher_competencies.csv")
alerts_df = pd.read_csv(CLEAN_DIR / "alerts.csv")
risk_scores_df = pd.read_csv(CLEAN_DIR / "risk_scores.csv")

# Générer le corpus temporel : chaque enseignant × compétence × période
# On simule 4 périodes passées : t-3, t-2, t-1, t (mois)
# Pour simplifier : on génère 5000 lignes directement (pas par mois réels).

N_SAMPLES = 5000
COMPETENCY_CODES = sorted(competencies_df["competence_code"].unique())
DEPT_CODES = sorted(teachers_df["department_code"].unique())


def generate_training_corpus(
    n_samples: int = N_SAMPLES,
    output_path: Path = BASE_DIR / "data" / "clean" / "training_corpus.csv",
) -> pd.DataFrame:
    """Génère le corpus d'entraînement temporel (sans fuite de données futures).

    Features X (AUCUNE fuite future) :
      - current_level (t-3, t-2, t-1, t) — historique
      - lag_gap (t-2 - t-3, t-1 - t-2, t - t-1) — tendance
      - rolling_tendance (moyenne des variations sur 3 mois)
      - days_since_last_training (historique)
      - training_velocity (formations/mois)
      - is_long_absent (binaire)
      - is_stagnant (binaire)
      - avg_level, min_level, max_level, nb_savoirs, nb_competences
      - nb_level_5, nb_level_1
      - competency_coverage_rate
      - nb_formations_completed, nb_formations_in_progress
      - taux_assiduite
      - nb_besoins_exprimes, nb_besoins_approuves
      - avg_eval_score, nb_evaluations
      - engagement_score
      - months_since_last_training, training_frequency_per_month

    IMPORTANT : `required_level_t` n'est PAS dans X (fuite : y=gap_next_3m
    depend de required_level). Le modele doit apprendre la tendance historique
    sans connaitre la cible formelle.

    Target y :
      - gap_next_3m : prediction du gap 3 mois dans le futur (anticipation)
      = max(0, required_level_t+3 - current_level_t+3)
      Pour simplifier : on simule current_level_t+3 par une degradation
      aleatoire (risque de stagnation) ou une amelioration (effet formation).
    """
    rows: list[dict[str, Any]] = []
    for i in range(n_samples):
        # Sélectionner un enseignant et une compétence aléatoire
        teacher = teachers_df.sample(n=1).iloc[0]
        comp = competencies_df.sample(n=1).iloc[0]

        # Historique temporel (simulé sur 4 périodes)
        # Pour simplifier : on génère des niveaux actuels simulés
        # avec une tendance (amélioration / stagnation / régression)
        base_current = int(comp["current_level"])
        base_required = int(comp["required_level"])

        # Simuler 4 périodes passées (t-3, t-2, t-1, t)
        # On crée un historique avec une tendance
        # Amélioration si formation récente, stagnation sinon
        current_hist = [
            max(1, min(5, base_current + random.randint(-1, 1))),
            max(1, min(5, base_current + random.randint(-1, 1))),
            max(1, min(5, base_current + random.randint(-1, 1))),
            max(1, min(5, base_current + random.randint(-1, 1))),
        ]

        # Target : gap_next_3m (anticipation)
        # Simulation : le niveau futur est influencé par la tendance historique
        # et par le fait que la formation est terminée ou non
        has_training_impact = random.random() < 0.4  # 40% des cas avec formation
        if has_training_impact:
            future_current = min(5, base_current + 1)
        else:
            # Sans formation : stagnation ou légère régression
            future_current = max(1, base_current - random.randint(0, 1))
        future_gap = max(0, base_required - future_current)
        future_gap = max(0, min(5, future_gap))  # Clamp

        # Features temporelles (sans fuite de données futures)
        # current_level au temps t
        current_t = current_hist[-1]
        # Lag gaps (tendances entre périodes)
        lag_gap_1 = (current_hist[2] - current_hist[1]) if len(current_hist) >= 3 else 0
        lag_gap_2 = (current_hist[3] - current_hist[2]) if len(current_hist) >= 4 else 0
        rolling_tendance = (current_hist[-1] - current_hist[0]) / 3.0

        # Days since last training (historique)
        last_training_days = random.randint(30, 365)
        # Training velocity (historique)
        training_velocity = random.randint(0, 5) / 12.0  # formations/mois

        # Engagement / stagnation (historique)
        is_long_absent = 1 if last_training_days > 180 else 0
        is_stagnant = 1 if rolling_tendance <= -0.5 else 0

        # Metrics agrégées (simulées)
        avg_level_hist = sum(current_hist) / len(current_hist)
        min_level_hist = min(current_hist)
        max_level_hist = max(current_hist)
        nb_level_5 = sum(1 for c in current_hist if c >= 5)
        nb_level_1 = sum(1 for c in current_hist if c <= 1)
        nb_savoirs = random.randint(1, 3)
        nb_competences = random.randint(1, 3)
        nb_formations_completed = random.randint(0, 5)
        nb_formations_in_progress = random.randint(0, 3)
        taux_assiduite = round(random.uniform(0.5, 0.95), 2)
        nb_besoins_exprimes = random.randint(0, 4)
        nb_besoins_approuves = random.randint(0, 2)
        avg_eval_score = round(random.uniform(2.5, 4.5), 2)
        nb_evaluations = random.randint(1, 4)
        months_since_last_training = int(last_training_days / 30)

        # Engagement score (calcule de la meme facon que feature_engineering)
        engagement_score = (
            nb_formations_completed * 2 +
            nb_evaluations * 1.5 +
            nb_besoins_exprimes * 1 +
            taux_assiduite * 5 +
            avg_eval_score * 2
        )
        # Coverage rate (simulée)
        covered = max(1, nb_competences - 1)
        coverage_rate = covered / max(nb_competences, 1)

        row = {
            "teacher_id": str(teacher["teacher_id"]),
            "competence_code": str(comp["competence_code"]),
            "competence_nom": str(comp["competence_nom"]),
            "domaine": str(comp["domaine"]),
            # Historique temporel (sans fuite future)
            "current_level_t3": current_hist[0],
            "current_level_t2": current_hist[1],
            "current_level_t1": current_hist[2],
            "current_level_t": current_hist[3],
            # Target : anticipation gap_next_3m (PAS dans X)
            "gap_next_3m": future_gap,
            # Features temporelles (sans fuite future)
            "lag_gap_t3_t2": current_hist[1] - current_hist[0],
            "lag_gap_t2_t1": current_hist[2] - current_hist[1],
            "lag_gap_t1_t": current_hist[3] - current_hist[2],
            "rolling_tendance": round(rolling_tendance, 2),
            # Engagement / stagnation
            "days_since_last_training": last_training_days,
            "training_frequency_per_month": round(training_velocity, 2),
            "is_long_absent": is_long_absent,
            "is_stagnant": is_stagnant,
            # Metrics agrégées
            "avg_level": round(avg_level_hist, 2),
            "min_level": min_level_hist,
            "max_level": max_level_hist,
            "nb_level_5": nb_level_5,
            "nb_level_1": nb_level_1,
            "nb_savoirs": nb_savoirs,
            "nb_competences": nb_competences,
            "competency_coverage_rate": round(coverage_rate, 2),
            "nb_formations_completed": nb_formations_completed,
            "nb_formations_in_progress": nb_formations_in_progress,
            "taux_assiduite": taux_assiduite,
            "nb_besoins_exprimes": nb_besoins_exprimes,
            "nb_besoins_approuves": nb_besoins_approuves,
            "avg_eval_score": avg_eval_score,
            "nb_evaluations": nb_evaluations,
            "months_since_last_training": months_since_last_training,
            "engagement_score": round(engagement_score, 2),
        }
        rows.append(row)

    df_corpus = pd.DataFrame(rows)
    df_corpus.to_csv(output_path, index=False)
    print(f"[OK] Training corpus generated: {len(rows)} rows → {output_path}")
    return df_corpus


if __name__ == "__main__":
    generate_training_corpus()
