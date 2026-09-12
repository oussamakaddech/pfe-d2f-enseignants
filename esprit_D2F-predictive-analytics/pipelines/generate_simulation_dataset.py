"""Generateur de donnees de SIMULATION documente et reproductible (D2F).

PROMPT : VALIDATION ML SUR DONNEES SIMULEES ASSUMEES (D2F) - ETAPE 2

Contrainte : AUCUNE donnee RH reelle ESPRIT disponible. Le corpus actuel
(147 lignes, 40 enseignants, is_synthetic=false) est un corpus de demonstration
issu de la base de dev (seed SQL), NON atteste DSI. Ce generateur assume
explicitement la simulation pour valider la METHODOLOGIE (pipeline, gouvernance,
calibration, backtest) sans jamais pretendre a une performance reelle.

Regles :
  - seed fixe 42 ; deux executions produisent des fichiers identiques (hash canonique, LF)
  - Parametres exposes en tete et exportes dans simulation_manifest.json
  - Chaque ligne : data_origin=SIMULATED, is_synthetic=true, generator_version, seed
  - Interdiction d'ecrire data_origin=INSTITUTIONAL_RECORD
  - Realisme metier : departements reels ESPRIT, hierarchie Domaine->Competence->Sous-competence->Savoir,
    N1-N5, Bloom, 36 mois, progressions/paliers/stagnations/declins, formations correlees aux progressions,
    desequilibre classes risque, re-mesures M+3 observees (target_observation_date, is_extrapolated=false)

Usage :
    python -m pipelines.generate_simulation_dataset --seed 42 --output data/simulation/simulation_dataset.csv
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

# =============================================================================
# PARAMETRES DE GENERATION EXPOSES EN TETE (exportes dans manifest)
# =============================================================================
SEED = 42
GENERATOR_VERSION = "simulation-v1.0.0"
DATASET_VERSION = "simulation-v1.0.0"
DATASET_KIND = "simulation-assumed"

# Teachers & hierarchy
N_TEACHERS = 45  # >=40
N_DOMAINS = 5
N_COMPETENCES = 12
N_SOUS_COMPETENCES = 24
N_SAVOIRS = 48  # total savoirs dans referentiel

# Temporal
N_MONTHS = 36  # historique 36 mois
MONTH_START = pd.Period("2023-01", freq="M")  # 2023-01 .. 2025-12
TARGET_HORIZON_MONTHS = 3

# Departements reels ESPRIT (5)
DEPARTMENTS = [
    {"code": "DEPT_INFO", "label": "Informatique", "up": "UP_INFO"},
    {"code": "DEPT_GC", "label": "Genie Civil", "up": "UP_GC"},
    {"code": "DEPT_GE", "label": "Genie Electrique", "up": "UP_GE"},
    {"code": "DEPT_GM", "label": "Genie Mecanique", "up": "UP_GM"},
    {"code": "DEPT_TEL", "label": "Telecommunications", "up": "UP_TEL"},
]

# Domaines pedagogiques (5) -> repartition Bloom inspiree
DOMAINS = [
    {"id": 1, "code": "D-INFO", "label": "Informatique"},
    {"id": 2, "code": "D-GC", "label": "Genie Civil"},
    {"id": 3, "code": "D-GE", "label": "Genie Electrique"},
    {"id": 4, "code": "D-GM", "label": "Genie Mecanique"},
    {"id": 5, "code": "D-TEL", "label": "Telecommunications"},
]

# Bloom-inspired distribution of required levels: more intermediate than expert
# N1 5%, N2 15%, N3 40%, N4 25%, N5 15%
BLOOM_LVLS = [1, 2, 3, 4, 5]
BLOOM_PROBS = [0.05, 0.15, 0.40, 0.25, 0.15]

# Feature schema (identique au serving 1.0)
FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]

SCALE_MIN = 1.0
SCALE_MAX = 5.0
GAP_MIN = 0.0
GAP_MAX = 5.0

# Interdiction absolue
FORBIDDEN_ORIGIN = "INSTITUTIONAL_RECORD"

BASE_DIR = Path(__file__).parent.parent
SIMULATION_DIR = BASE_DIR / "data" / "simulation"
CLEAN_DIR = BASE_DIR / "data" / "clean"
REPORTS_DIR = BASE_DIR / "reports"
MANIFEST_PATH = REPORTS_DIR / "simulation_manifest.json"

# =============================================================================
# UTILITAIRES
# =============================================================================

def _clip(v: float, lo: float, hi: float) -> float:
    return float(min(hi, max(lo, v)))


def _level(s: float) -> int:
    return int(round(_clip(s, SCALE_MIN, SCALE_MAX)))


def _end_of_month(period: pd.Period) -> pd.Timestamp:
    return period.to_timestamp(how="end")


def _canonical_hash(df: pd.DataFrame) -> str:
    """Hash canonique LF stable (tri colonnes + lignes, lineterminator=\\n)."""
    if df is None or df.empty:
        return hashlib.sha256(b"").hexdigest()
    # Tri par toutes colonnes (stable) + canonical LF
    canonical = df.copy().sort_values(by=df.columns.tolist(), kind="stable").reset_index(drop=True)
    payload = canonical.to_csv(index=False, lineterminator="\n")
    # Normaliser CRLF -> LF + newline final
    text = payload.replace("\r\n", "\n").replace("\r", "\n")
    if not text.endswith("\n"):
        text += "\n"
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _write_csv(df: pd.DataFrame, path: Path) -> None:
    """Ecriture CSV LF deterministe (is_synthetic en chaine true/false pour compat)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    out = df.copy()
    # Normaliser booleens en strings pour compat file_hash existant (sinon hash differe)
    # Mais garder vrais bool pour validation ; on ecrit en vrai bool string
    for col in ("is_synthetic", "is_extrapolated"):
        if col in out.columns:
            # Ecrire en 'true'/'false' n'est pas utilise ici - on garde bool natif pour tests
            # Mais pour compat CSV, pandas ecrira True/False -> on force 'true'/'false' ?
            # On garde booleens natifs pandas -> True/False string ; hash canonique normalise,
            # donc c'est reproductible meme avec changement casse ? Pour robustesse, on map.
            out[col] = out[col].map(lambda b: "true" if bool(b) else "false" if pd.notna(b) else b)
    out.to_csv(path, index=False, lineterminator="\n")


# =============================================================================
# GENERATION
# =============================================================================

def build_hierarchy(rng: np.random.Generator):
    """Construit hierarchie Domaine -> Competence -> Sous-competence -> Savoir.

    Justification metier :
      - 5 domaines = departements reels ESPRIT
      - 12 competences reparties (~2-3 par domaine)
      - 24 sous-competences (~2 par competence)
      - 48 savoirs (~2 par sous-competence)
      - Prerequis : 20% des competences ont un prerequis (N3 dans autre competence)
      - Niveaux requis inspires Bloom : distribution [5,15,40,25,15] favorise N3
    """
    domaines = DOMAINS
    competences = []
    sous_competences = []
    savoirs = []

    comp_id = 1
    for d in domaines:
        n_comp = 2 if d["id"] in (2, 4) else 3  # GC/GM un peu moins
        for i in range(n_comp):
            cid = comp_id
            competences.append({
                "id": cid,
                "code": f"C{cid:02d}",
                "nom": f"Competence {cid} ({d['label']})",
                "domaine_id": d["id"],
                "domaine_code": d["code"],
                "domaine_label": d["label"],
                "prerequis": None,
            })
            comp_id += 1
            if comp_id > N_COMPETENCES:
                break
        if comp_id > N_COMPETENCES:
            break
    # Prerequis : 20% des competences (hors premieres) exigent N3 dans competence precedente
    for c in competences:
        if c["id"] > 3 and rng.random() < 0.20:
            prereq = rng.choice([x["id"] for x in competences if x["id"] < c["id"]])
            c["prerequis"] = {"competence_id": int(prereq), "niveau_min": 3}

    # Sous-competences : ~2 par competence
    sc_id = 1
    for comp in competences:
        for j in range(2):
            sous_competences.append({
                "id": sc_id,
                "code": f"SC{sc_id:03d}",
                "nom": f"Sous-competence {sc_id}",
                "competence_id": comp["id"],
            })
            sc_id += 1
    # Limiter a N_SOUS_COMPETENCES
    sous_competences = sous_competences[:N_SOUS_COMPETENCES]

    # Savoirs : ~2 par sous-competence, niveau requis Bloom
    sav_id = 1
    for sc in sous_competences:
        for k in range(2):
            lvl = int(rng.choice(BLOOM_LVLS, p=BLOOM_PROBS))
            savoirs.append({
                "id": sav_id,
                "code": f"S{sav_id:04d}",
                "nom": f"Savoir {sav_id}",
                "sous_competence_id": sc["id"],
                "competence_id": sc["competence_id"],
                "niveau_requis": lvl,
                "niveau_label": f"N{lvl}_{['DEBUTANT','ELEMENTAIRE','INTERMEDIAIRE','AVANCE','EXPERT'][lvl-1]}",
            })
            sav_id += 1
    savoirs = savoirs[:N_SAVOIRS]
    return domaines, competences, sous_competences, savoirs


def generate_simulation_dataset(
    seed: int = SEED,
    output_path: Path | None = None,
    manifest_path: Path | None = None,
) -> dict:
    """Genere le corpus simule et l'ecrit. Retourne le manifest."""
    if seed != 42:
        # Reproductibilite : seed fixe documente, mais on autorise override pour test non-regression
        pass
    rng = np.random.default_rng(seed)
    periods = [MONTH_START + i for i in range(N_MONTHS)]  # 36 mois
    # Latent months inclut +3 pour cible observee
    latent_periods = periods + [periods[-1] + i + 1 for i in range(TARGET_HORIZON_MONTHS)]

    domaines, competences, sous_comps, savoirs = build_hierarchy(rng)

    # Maps
    savoir_by_id = {s["id"]: s for s in savoirs}
    comp_by_id = {c["id"]: c for c in competences}
    # Competence -> savoirs
    savoirs_by_comp = {}
    for s in savoirs:
        savoirs_by_comp.setdefault(s["competence_id"], []).append(s)

    # Enseignants : 45 repartis sur 5 departements (repartition realiste)
    dept_codes = [d["code"] for d in DEPARTMENTS]
    dept_labels = [d["label"] for d in DEPARTMENTS]
    # Distribution : informatique un peu plus gros
    dept_weights = [0.30, 0.20, 0.20, 0.15, 0.15]
    teacher_depts_idx = rng.choice(len(DEPARTMENTS), size=N_TEACHERS, p=dept_weights)
    teachers = []
    for i in range(N_TEACHERS):
        di = int(teacher_depts_idx[i])
        d = DEPARTMENTS[di]
        # ID type ENS_SIM_001
        tid = f"ENS_SIM_{i+1:03d}"
        teachers.append({
            "id": tid,
            "dept_code": d["code"],
            "dept_label": d["label"],
            "up_code": d["up"],
            "up_label": f"UP {d['label']}",
            "gamma": float(np.clip(rng.normal(0.0, 0.55), -1.3, 1.3)),  # aptitude
            "base_engagement": float(np.clip(rng.beta(3.0, 2.2), 0.08, 0.95)),
        })

    # Pour desequilibre risque : 15% critical, 25% high, 30% medium, 30% low (realiste)
    # On l'obtiendra via distribution gamma et engagement, mais on force un peu via bias

    records = []

    # Pre-generate training events corrélations
    # Chaque enseignant a des formations planifiées qui causent des bumps
    # Modelisation : chaque competence detenue a un calendrier de formations
    # p_formation mensuelle depend de engagement : p = 0.04 + 0.08*att + 0.02*gamma

    for teacher in teachers:
        tid = teacher["id"]
        gamma = teacher["gamma"]
        base_eng = teacher["base_engagement"]

        # Compétences détenues : échantillon 6-10 competences par enseignant (selon dept)
        # Biais : enseignant a plus de competences dans son dept (70% des competences choisies)
        owned_comp_ids = set()
        # Dept to domaines mapping (simplifié : dept INF0 -> domaine D-INFO, etc.)
        dept_to_domain = {
            "DEPT_INFO": [1],
            "DEPT_GC": [2],
            "DEPT_GE": [3],
            "DEPT_GM": [4],
            "DEPT_TEL": [5],
        }
        pref_domains = dept_to_domain.get(teacher["dept_code"], [1])
        pref_comps = [c["id"] for c in competences if c["domaine_id"] in pref_domains]
        other_comps = [c["id"] for c in competences if c["domaine_id"] not in pref_domains]
        n_owned = int(rng.integers(6, 11))
        n_pref = min(len(pref_comps), int(n_owned * 0.65))
        n_other = n_owned - n_pref
        owned = list(rng.choice(pref_comps, size=n_pref, replace=False)) if n_pref else []
        if n_other > 0 and other_comps:
            owned += list(rng.choice(other_comps, size=min(n_other, len(other_comps)), replace=False))
        owned_comp_ids = set(owned)

        # Etat latent par competence (savoir aggregation)
        # Pour chaque competence, on genere une trajectoire latente S_m continue
        latent_by_comp: dict[int, dict] = {}

        for cid in owned_comp_ids:
            comp_savoirs = savoirs_by_comp.get(cid, [])
            # Niveau requis max de la competence (max des savoirs)
            required_max = max(s["niveau_requis"] for s in comp_savoirs) if comp_savoirs else 3
            # Aptitude initiale S0 normal 3.0, 0.85, clip [1,5]
            s0 = float(np.clip(rng.normal(3.0, 0.85), SCALE_MIN, SCALE_MAX))
            # Drift mensuel legerement negatif en moyenne (sans formation, stagnation)
            drift = float(rng.normal(-0.015, 0.028))
            s = s0
            levels: dict[int, int] = {}  # month index -> level 1..5
            # Stagnation tracking
            stagnation_counter = 0
            # Formations completed per month list
            training_completed_months: list[int] = []
            # Formations schedule (ask->due)
            scheduled: list[tuple[int, int]] = []
            # Evaluations monthly
            # Need events
            need_events_months: list[int] = []

            # Generate latent trajectory
            # Training probability per month depends on engagement trajectory (on fait evoluer att)
            att_monthly = {}
            for m_idx in range(len(latent_periods)):
                # Att monthly variable autour de base_engagement
                att = float(np.clip(base_eng + rng.normal(0.0, 0.09), 0.0, 1.0))
                att_monthly[m_idx] = att
                p_done = float(np.clip(0.035 + 0.09 * att + 0.025 * gamma, 0.015, 0.28))
                done = rng.random() < p_done
                # Scheduled formations that become due
                dues = [due for ask, due in scheduled if due == m_idx]
                for _ in dues:
                    if rng.random() < 0.82:  # completion rate des planifiees
                        done = True
                if done and rng.random() < 0.78:
                    # Bump realiste palier : 0.35-0.70
                    bump = float(rng.uniform(0.32, 0.68))
                    # Diminishing returns near 5
                    bump *= (1.0 - (s - SCALE_MIN) / (SCALE_MAX - SCALE_MIN) * 0.35)
                    s += bump
                if done:
                    training_completed_months.append(m_idx)
                # Occasional decline (5% chance) : -0.3 to -0.6 due a absence
                if rng.random() < 0.04:
                    s -= float(rng.uniform(0.15, 0.45))
                # Scheduled new formation with 10%+ engagement
                if rng.random() < 0.09 + 0.07 * base_eng:
                    due_offset = int(rng.integers(1, 4))  # due in 1..3 months
                    scheduled.append((m_idx, m_idx + due_offset))
                # Drift + bruit
                s += drift + float(rng.normal(0.0, 0.075))
                s = float(np.clip(s, SCALE_MIN - 0.2, SCALE_MAX + 0.2))  # allow slight overshoot then clip to level
                lvl = _level(s)
                levels[m_idx] = lvl
                # Need detection : if gap >=1 at this month, need event with prob
                gap_now = required_max - lvl
                if gap_now >= 1 and rng.random() < 0.18:
                    need_events_months.append(m_idx)

            latent_by_comp[cid] = {
                "levels": levels,
                "required_max": required_max,
                "training_completed": sorted(training_completed_months),
                "scheduled": scheduled,
                "need_events": need_events_months,
                "att_monthly": att_monthly,
                "comp_savoirs": comp_savoirs,
            }

        # Global teacher evaluations (monthly)
        eval_monthly = {}
        for m_idx in range(len(latent_periods)):
            # Eval moyenne 2.8 + gamma + small trend + noise
            eval_monthly[m_idx] = float(np.clip(2.7 + gamma * 0.6 + 0.012 * m_idx + rng.normal(0.0, 0.38), 0.0, 5.0))

        # Build rows : pour chaque competence detenue, pour chaque mois t où t+3 existe et dans periode observable
        # Observation window : periods[3]..periods[-4] (pour avoir t-3 et t+3)
        # On veut au moins 6 mois distincts, on prend tous les mois intermediaires
        for cid in owned_comp_ids:
            state = latent_by_comp[cid]
            levels = state["levels"]
            required_max = state["required_max"]
            att_monthly = state["att_monthly"]
            training_completed = state["training_completed"]
            scheduled = state["scheduled"]
            need_events = state["need_events"]
            comp_savoirs = state["comp_savoirs"]

            # For each month t in periods (0..N_MONTHS-1) where we have t-3 and t+3 in latent
            for mi in range(N_MONTHS):
                # Need history: mi-3 .. mi available (latent includes - we have 0..)
                # For early months, we still have levels but pad via first level for t-3 etc.
                # For target, need mi+3 < len(latent_periods)
                if mi + TARGET_HORIZON_MONTHS >= len(latent_periods):
                    continue
                # Only emit if mi >=3 to have real history? But we can pad early as serving does
                # Emit for mi >=0 but with pad - we emit for all mi to get >=500 rows
                # Actually we want at least 500, so emit for mi from 3 to N_MONTHS-4 inclusive (~30 months)
                if mi < 3 or mi > N_MONTHS - 4:
                    continue

                m_period = periods[mi]
                date_t = _end_of_month(m_period)
                ref_month_str = str(m_period)
                target_period = periods[mi + TARGET_HORIZON_MONTHS] if mi + TARGET_HORIZON_MONTHS < len(periods) else latent_periods[mi + TARGET_HORIZON_MONTHS]
                target_date = _end_of_month(target_period)

                # History levels t-3..t
                l3 = levels[mi - 3] if mi - 3 in levels else levels[mi]
                l2 = levels[mi - 2] if mi - 2 in levels else levels[mi]
                l1 = levels[mi - 1] if mi - 1 in levels else levels[mi]
                lt = levels[mi]
                # Target level at t+3 observed
                l_future = levels[mi + TARGET_HORIZON_MONTHS]

                gap_next_3m = float(np.clip(required_max - l_future, GAP_MIN, GAP_MAX))
                # Add small noise to target to avoid trivial deterministic gap (but still observed)
                # Noise 0.0-0.15 already implicit via rounding? Keep exact for observability
                gap_next_3m = float(np.clip(gap_next_3m + rng.normal(0.0, 0.10), GAP_MIN, GAP_MAX))
                gap_next_3m = round(gap_next_3m, 3)

                # Features calculation (align with serving)
                lag32 = float(l2 - l3)
                lag21 = float(l1 - l2)
                lag1t = float(lt - l1)
                rolling = round((lag32 + lag21 + lag1t) / 3.0, 3)

                # Stagnation months (consecutive equal levels)
                stagnation = 0
                for k in range(mi, max(-1, mi - 12), -1):
                    if k - 1 >= 0 and levels[k] == levels[k - 1]:
                        stagnation += 1
                    else:
                        break

                # Training features at time t
                completed_upto = [j for j in training_completed if j <= mi]
                training_count = len(completed_upto)
                if completed_upto:
                    last_j = max(completed_upto)
                    last_period = periods[last_j] if last_j < len(periods) else latent_periods[last_j]
                    days_since = max(0, (date_t - _end_of_month(last_period)).days)
                else:
                    days_since = 999.0
                months_since = round(min(13.0, days_since / 30.44), 3)
                training_freq = round(training_count / max(1.0, mi + 4.0), 3)

                # In-progress formations (scheduled due in next 3 months)
                in_progress = len([due for ask, due in scheduled if mi < due <= mi + 3])

                need_count = len([j for j in need_events if j <= mi])
                # Approved needs correlated with training : 55% approbation
                approved_count = int(need_count * 0.55) + int(rng.integers(0, 2) if need_count else 0)
                approved_count = min(approved_count, need_count)

                att = round(float(np.clip(att_monthly[mi] + rng.normal(0.0, 0.02), 0.0, 1.0)), 3)
                # Evaluations
                eval_score = round(float(eval_monthly[mi]), 3)
                eval_mean = round(float(np.mean([eval_monthly[j] for j in range(mi + 1)])), 3)

                engagement = round(float(np.clip(
                    0.45 * att
                    + 0.25 * min(1.0, training_freq * 6.0)
                    + 0.15 * (eval_score / 5.0)
                    + 0.15 * (1.0 - min(1.0, stagnation / 12.0))
                    + rng.normal(0.0, 0.05),
                    0.0, 1.0)), 3)

                # Global aggregations
                # For avg/min/max over last 4 levels
                recent_levels = [l3, l2, l1, lt]
                avg_level = round(float(np.mean(recent_levels)), 3)
                min_level = float(min(recent_levels))
                max_level = float(max(recent_levels))
                nb_l5 = float(sum(1 for v in recent_levels if v == 5))
                nb_l1 = float(sum(1 for v in recent_levels if v == 1))

                # nb_savoirs = number of savoirs in competence (2-3) + variation
                nb_savoirs = float(len(comp_savoirs))
                nb_competences = float(len(owned_comp_ids))
                coverage = round(len(owned_comp_ids) / N_COMPETENCES, 3)

                # Current observation pedagogique (proxy)
                observation = round(float(np.clip(0.62 * lt + 0.58 + 0.14 * gamma + rng.normal(0.0, 0.35), 0.0, 5.0)), 2)

                # Risk-related balance: teacher's gap distribution already realistic,
                # risk will be derived via rule_risk_from_gaps but we ensure desequilibre

                # Provenance & tagging
                # source_id = verifiable trace: teacher + competence + period
                source_id = f"SIM_{tid}_{cid}_{m_period.strftime('%Y%m')}"
                # data_origin STRICTEMENT SIMULATED
                data_origin = "SIMULATED"
                is_synthetic = True
                is_extrapolated = False  # Cible OBSERVEE
                target_observation_date = target_date.date().isoformat()

                # Knowledge difficulty : required_max -2 (pedagogical difficulty, never feature leakage)
                knowledge_difficulty = float(required_max - 2)

                # Department info
                dept_code = teacher["dept_code"]
                up_code = teacher["up_code"]

                records.append({
                    "teacher_id": tid,
                    "competence_id": int(cid),
                    "competence_code": f"C{cid}",
                    "department_id": dept_code,
                    "unit_id": up_code,
                    "ref_month": ref_month_str,
                    "date_t": date_t.date().isoformat(),
                    "target_observation_date": target_observation_date,
                    "is_extrapolated": is_extrapolated,
                    "current_observation": observation,
                    "knowledge_difficulty_level": knowledge_difficulty,
                    "required_level": float(required_max),
                    "gap_next_3m": gap_next_3m,
                    # Temporal features
                    "current_level_t3": float(l3),
                    "current_level_t2": float(l2),
                    "current_level_t1": float(l1),
                    "current_level_t": float(lt),
                    "lag_gap_t3_t2": lag32,
                    "lag_gap_t2_t1": lag21,
                    "lag_gap_t1_t": lag1t,
                    "rolling_tendance": rolling,
                    "days_since_last_training": float(days_since),
                    "training_frequency_per_month": training_freq,
                    "is_long_absent": int(att < 0.5),
                    "is_stagnant": int(stagnation >= 3),
                    "avg_level": avg_level,
                    "min_level": min_level,
                    "max_level": max_level,
                    "nb_level_5": nb_l5,
                    "nb_level_1": nb_l1,
                    "nb_savoirs": nb_savoirs,
                    "nb_competences": nb_competences,
                    "competency_coverage_rate": coverage,
                    "nb_formations_completed": float(training_count),
                    "nb_formations_in_progress": float(in_progress),
                    "taux_assiduite": att,
                    "nb_besoins_exprimes": float(need_count),
                    "nb_besoins_approuves": float(approved_count),
                    "avg_eval_score": eval_mean,
                    "nb_evaluations": float(mi + 1),
                    "months_since_last_training": months_since,
                    "engagement_score": engagement,
                    # Aliases for compat
                    "attendance_rate": att,
                    "evaluation_score": eval_score,
                    "training_count": training_count,
                    "stagnation_months": float(stagnation),
                    "need_count": float(need_count),
                    # Provenance (etiquetage systematique)
                    "source_type": "simulation_generator",
                    "source_id": source_id,
                    "data_origin": data_origin,
                    "is_synthetic": is_synthetic,
                    "institutional_verified": False,
                    "generation_seed": int(seed),
                    "generator_version": GENERATOR_VERSION,
                    "dataset_version": DATASET_VERSION,
                    "created_at": date_t.date().isoformat(),
                })

    df = pd.DataFrame(records)
    # Verification invariants
    assert not df.empty, "Dataset vide"
    # Interdire d'ecrire INSTITUTIONAL_RECORD
    assert (df["data_origin"] != FORBIDDEN_ORIGIN).all(), "data_origin INSTITUTIONAL_RECORD interdit"
    assert df["is_synthetic"].astype(bool).all(), "toutes lignes doivent être is_synthetic=true"
    assert (df["data_origin"] == "SIMULATED").all(), "data_origin doit être SIMULATED"
    assert (~df["is_extrapolated"].astype(bool)).all(), "is_extrapolated doit être false (cible observée)"

    # Sort canonical for reproducibility
    df = df.sort_values(["ref_month", "teacher_id", "competence_id"]).reset_index(drop=True)

    # Write CSV
    out = output_path or (SIMULATION_DIR / f"simulation_dataset_{DATASET_VERSION}.csv")
    out_clean = CLEAN_DIR / "simulation_dataset.csv"
    _write_csv(df, out)
    # Also copy to clean for pipeline compatibility ONLY for default runs (seed 42 main)
    # Pour eviter qu'un test avec seed different ecrase le corpus principal
    if output_path is None:
        _write_csv(df, out_clean)

    # Hash canonique (apres normalisation true/false)
    df_read = pd.read_csv(out)
    dataset_hash = _canonical_hash(df_read)
    generator_hash = _sha256_file(Path(__file__))

    # Simulation manifest
    # Distributions documentees
    manifest = {
        "generator": "pipelines/generate_simulation_dataset.py",
        "generator_version": GENERATOR_VERSION,
        "seed": int(seed),
        "dataset_version": DATASET_VERSION,
        "dataset_kind": DATASET_KIND,
        "output_path": str(out),
        "clean_path": str(out_clean),
        "n_rows": int(len(df)),
        "n_teachers": int(df["teacher_id"].nunique()),
        "n_competences": int(df["competence_id"].nunique()),
        "n_months": int(df["ref_month"].nunique()),
        "period_start": str(periods[0]),
        "period_end": str(periods[-1]),
        "n_months_total": N_MONTHS,
        "target_horizon": f"{TARGET_HORIZON_MONTHS}m",
        "granularity": "teacher_id + competence_id + ref_month (snapshot t-3..t, cible t+3 observee)",
        "data_origin": "SIMULATED",
        "is_synthetic": True,
        "is_extrapolated": False,
        "target_validity": "OBSERVED_IN_SIMULATION",
        "validation_scope": "SIMULATION_VALIDATED",
        "dataset_hash": dataset_hash,
        "generator_hash": generator_hash,
        "distributions": {
            "teacher_per_department": df["department_id"].value_counts().to_dict(),
            "required_level_bloom": {int(k): int(v) for k, v in pd.Series([s["niveau_requis"] for s in savoirs]).value_counts().sort_index().items()},
            "bloom_probs": dict(zip(BLOOM_LVLS, BLOOM_PROBS)),
            "level_drift_mean": -0.015,
            "level_drift_std": 0.028,
            "initial_level_mean": 3.0,
            "initial_level_std": 0.85,
            "training_prob_base": "0.035 + 0.09*att + 0.025*gamma, bump U(0.32,0.68), completion 82%",
            "stagnation_threshold": ">=3 mois consecutifs sans evolution",
            "decline_prob": 0.04,
        },
        "hierarchy": {
            "n_domains": N_DOMAINS,
            "n_competences": N_COMPETENCES,
            "n_sous_competences": N_SOUS_COMPETENCES,
            "n_savoirs": N_SAVOIRS,
            "prerequis_rate": "20% competences avec prerequis N3",
            "niveaux": "N1..N5",
        },
        "correlations": {
            "formations -> progressions": "formation suivie augmente niveau de 0.32-0.68 avec proba 0.78 (palier Bloom)",
            "absence formation -> stagnation": "sans formation, drift legerement negatif + bruit, stagnation >=3 mois declenche is_stagnant",
            "assiduite -> engagement": "engagement = 0.45*att + 0.25*activite_formation + 0.15*eval/5 + 0.15*(1-stagnation/12) + bruit",
            "stagnation -> gap futur": "stagnation elevee => niveau futur plus faible => gap_next_3m plus eleve",
        },
        "features": FEATURE_COLS,
        "provenance_columns": ["source_type", "source_id", "data_origin", "is_synthetic", "is_extrapolated", "target_observation_date", "generator_version", "generation_seed", "dataset_version", "created_at"],
        "reproducibility": {
            "seed": int(seed),
            "hash_method": "SHA256 canonique LF (tri colonnes+lignes, lineterminator=\\n)",
            "dataset_hash": dataset_hash,
            "generator_hash": generator_hash,
            "note": "Deux executions avec seed 42 produisent des fichiers identiques (hash identique)",
        },
        "gouvernance": {
            "data_origin": "SIMULATED",
            "target_validity": "OBSERVED_IN_SIMULATION",
            "validation_scope": "SIMULATION_VALIDATED",
            "interdit": "data_origin=INSTITUTIONAL_RECORD jamais ecrit par generateur",
            "is_extrapolated": False,
            "target_observation_date": "toujours rempli (date de re-mesure a t+3)",
        },
        "warning": "Dataset 100% SIMULE. Performances = validation methodologie/pipeline/gouvernance uniquement, PAS performance reelle ESPRIT.",
    }

    # Write manifest
    manifest_out = manifest_path or MANIFEST_PATH
    manifest_out.parent.mkdir(parents=True, exist_ok=True)
    manifest_out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    # Also write classic report for compat
    report = {
        "dataset_kind": DATASET_KIND,
        "rows": int(len(df)),
        "teachers": int(df["teacher_id"].nunique()),
        "competencies": int(df["competence_id"].nunique()),
        "months": int(df["ref_month"].nunique()),
        "seed": int(seed),
        "version": DATASET_VERSION,
        "output_path": str(out),
        "data_origin": "SIMULATED",
        "is_synthetic": True,
        "is_extrapolated": False,
        "dataset_hash": dataset_hash,
        "generator_hash": generator_hash,
    }
    (REPORTS_DIR / "simulation_generation_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Genere le dataset de simulation D2F (seed 42)")
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--output", type=str, default=None)
    parser.add_argument("--manifest", type=str, default=None)
    args = parser.parse_args()

    manifest = generate_simulation_dataset(
        seed=args.seed,
        output_path=Path(args.output) if args.output else None,
        manifest_path=Path(args.manifest) if args.manifest else None,
    )
    print(f"[OK] Dataset simule : {manifest['output_path']} ({manifest['n_rows']} lignes)")
    print(f"[OK] Hash canonique : {manifest['dataset_hash'][:16]}... (LF stable)")
    print(f"[OK] Manifest : {MANIFEST_PATH}")
    print(f"[OK] Enseignants: {manifest['n_teachers']}, Competences: {manifest['n_competences']}, Mois: {manifest['n_months']}")
    print(f"[OK] Provenance: data_origin=SIMULATED, is_synthetic=true, is_extrapolated=false, target_observation_date rempli")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
