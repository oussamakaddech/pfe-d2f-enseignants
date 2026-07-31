# -*- coding: utf-8 -*-
"""Diagnostique pourquoi tous les enseignants ont le même résultat (11%, FAIBLE).

Étapes :
1. Connexion DB via la config du service.
2. Liste des enseignants actifs.
3. Pour chaque enseignant :
   a. Récupère le TeacherRiskProfile persisté (score + facteurs).
   b. Récupère le détail des gaps persistés.
   c. Compare les facteurs → identifie ce qui est constant / différent.
4. Affiche un tableau comparatif + vérifie les données source
   (teacher_knowledge_assignments, enseignant_competences, besoins).
"""
import os
import sys
from pathlib import Path

# --- Setup environnement ---
ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))

# Charger le .env local du service (fournit DATABASE_URL)
env_path = ROOT / "esprit_D2F-predictive-analytics" / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

import os
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://d2f:d2fpasswd@localhost:7432/d2f")
print(f"[DB] {DATABASE_URL.split('@')[-1]}")

from sqlalchemy import create_engine, text
import pandas as pd

engine = create_engine(DATABASE_URL)

def q(sql, params=None):
    return pd.read_sql(text(sql), engine, params=params)

# -----------------------------------------------------------------------
# 1) Dataset brut — ce qui existe pour différencier les enseignants
# -----------------------------------------------------------------------
print("\n" + "="*80)
print("DATASET BRUT (ce qui DIFFÉRENCIE les enseignants dans la DB source)")
print("="*80)

checks = {
    "enseignants actifs": "SELECT COUNT(*) n FROM enseignants WHERE deleted_at IS NULL",
    "enseignant_competences (niveaux)": "SELECT COUNT(*) n FROM enseignant_competences",
    "teacher_knowledge_assignments actives": "SELECT COUNT(*) n FROM teacher_knowledge_assignments WHERE active=true",
    "besoin_formation": "SELECT COUNT(*) n FROM besoin_formation",
    "niveau_savoir_requis": "SELECT COUNT(*) n FROM niveau_savoir_requis",
    "skill_gaps persistés": "SELECT COUNT(*) n FROM skill_gaps",
}
for label, sql in checks.items():
    try:
        n = q(sql)["n"][0]
        print(f"  {label:42s} : {n}")
    except Exception as e:
        print(f"  {label:42s} : ERREUR {e}")

# -----------------------------------------------------------------------
# 2) Distribution des affectations par enseignant
# -----------------------------------------------------------------------
print("\n" + "="*80)
print("DISTRIBUTION DES AFFECTATIONS (source de différenciation)")
print("="*80)
try:
    df = q("""
        SELECT teacher_id, COUNT(*) n_assign,
               COUNT(*) FILTER (WHERE assignment_status='VALIDATED') n_validated
        FROM teacher_knowledge_assignments
        WHERE active=true
        GROUP BY teacher_id
        ORDER BY n_assign DESC
    """)
    print(df.to_string(index=False))
except Exception as e:
    print(f"  ERREUR : {e}")

# teacher_mapping (s'il existe)
try:
    df_map = q("""
        SELECT teacher_id, COUNT(DISTINCT competence_id) n_comp,
               string_agg(DISTINCT competence_id::varchar, ', ') comps
        FROM teacher_mapping
        GROUP BY teacher_id
    """)
    print("\n[teacher_mapping]")
    print(df_map.to_string(index=False))
except Exception:
    pass

# -----------------------------------------------------------------------
# 3) Résultats persistés PAR ENSEIGNANT — ce que l'API retourne
# -----------------------------------------------------------------------
print("\n" + "="*80)
print("RÉSULTATS PERSISTÉS — teacher_risk_profiles")
print("="*80)
try:
    rp = q("""
        SELECT enseignant_id, score_risque, niveau_risque,
               nb_gaps_critiques, nb_gaps_moderes, nb_gaps_faibles,
               taux_completion_formations,
               JSONB_PRETTY(facteurs_risque) AS facteurs
        FROM teacher_risk_profiles
        ORDER BY enseignant_id
    """)
    print(rp.drop(columns=["facteurs"]).to_string(index=False))
except Exception as e:
    print(f"  ERREUR : {e}")

# -----------------------------------------------------------------------
# 4) Détail des facteurs par enseignant
# -----------------------------------------------------------------------
print("\n" + "="*80)
print("FACTEURS DE RISQUE — COMPARAISON PAR ENSEIGNANT")
print("="*80)
try:
    rp_full = q("SELECT enseignant_id, facteurs_risque FROM teacher_risk_profiles ORDER BY enseignant_id")
    rows = []
    for _, r in rp_full.iterrows():
        f = r["facteurs_risque"] or {}
        factors = f.get("factors", {}) or {}
        row = {"enseignant_id": r["enseignant_id"]}
        for k in ("no_training", "stagnation", "gap_count", "feedback_decline", "unmet_needs"):
            row[k] = factors.get(k)
        rows.append(row)
    df_f = pd.DataFrame(rows)
    print(df_f.to_string(index=False))

    # Variance par facteur
    print("\n[Variance des facteurs — si 0 → identique pour tous]")
    for col in ("no_training", "stagnation", "gap_count", "feedback_decline", "unmet_needs"):
        if col in df_f.columns:
            v = df_f[col].dropna()
            if len(v) > 1:
                print(f"  {col:18s} : min={v.min():.4f}  max={v.max():.4f}  variance={v.var():.6f}")
except Exception as e:
    print(f"  ERREUR : {e}")

# -----------------------------------------------------------------------
# 5) Distribution des gaps persistés
# -----------------------------------------------------------------------
print("\n" + "="*80)
print("SKILL_GAPS PERSISTÉS — par enseignant et par urgence")
print("="*80)
try:
    g = q("""
        SELECT enseignant_id,
               COUNT(*) total,
               COUNT(*) FILTER (WHERE niveau_urgence='CRITIQUE') critiques,
               COUNT(*) FILTER (WHERE niveau_urgence='HAUTE') haute,
               COUNT(*) FILTER (WHERE niveau_urgence='MODEREE') moderee,
               COUNT(*) FILTER (WHERE niveau_urgence='FAIBLE') faible,
               COUNT(DISTINCT competence_nom) n_comp_uniques,
               COUNT(DISTINCT gap_type) n_types_uniques
        FROM skill_gaps
        GROUP BY enseignant_id
        ORDER BY enseignant_id
    """)
    print(g.to_string(index=False))
except Exception as e:
    print(f"  ERREUR : {e}")

# -----------------------------------------------------------------------
# 6) Gaps détaillés pour ENS001 (Karim) — ce que l'UI affiche
# -----------------------------------------------------------------------
print("\n" + "="*80)
print("DÉTAIL DES GAPS — ENS001 (Karim TRABELSI)")
print("="*80)
try:
    gg = q("""
        SELECT competence_nom, gap_score, priorite_score, niveau_urgence,
               mois_stagnation, en_regression,
               LEFT(justification, 60) justification
        FROM skill_gaps
        WHERE enseignant_id='ENS001'
        ORDER BY gap_score DESC
    """)
    print(gg.to_string(index=False))
except Exception as e:
    print(f"  ERREUR : {e}")

# -----------------------------------------------------------------------
# 7) Snapshot features (entrées des modèles)
# -----------------------------------------------------------------------
print("\n" + "="*80)
print("SNAPSHOT FEATURES — teacher_risk_profiles (historique)")
print("="*80)
try:
    sn = q("""
        SELECT enseignant_id, snapshot_date, score_risque, niveau_risque, tendance
        FROM teacher_risk_snapshots
        ORDER BY snapshot_date DESC, enseignant_id
        LIMIT 30
    """)
    print(sn.to_string(index=False))
except Exception as e:
    print(f"  ERREUR : {e}")

# -----------------------------------------------------------------------
# 8) Pourquoi identiques — verdict
# -----------------------------------------------------------------------
print("\n" + "="*80)
print("VERDICT")
print("="*80)
print("""
Si tous les facteurs sont identiques (no_training=0.10, gap_count=0.009, etc.),
cela confirme que :

1. teacher_knowledge_assignments est probablement VIDE ou identique pour
   tous les enseignants → GapEngine détecte les MÊMES 8 savoirs non assignés
   (car tous les enseignants n'ont aucune affectation).

2. build_factors_from_gaps lit :
   - taux_completion_formations du snapshot (FeatureEngine) — si le snapshot
     est calculé depuis des données vides, taux_completion = 0.9 → no_training
     = 1 - 0.9/100 ≈ 0.99, ou bien 0 si pas de formations.
   - nb_crit / total_gaps — même liste de gaps pour tout le monde.
   - mois_stagnation = 0 et en_regression = False — codés en dur dans
     _persist_gaps (valeurs 0/False fixes).

3. Le risque est donc déterminé par la couverture de la table `Knowledge`
   (référentiel global), PAS par le profil réel de l'enseignant.

FIX : soit peupler teacher_knowledge_assignments différemment par enseignant,
soit utiliser enseignant_competences (niveaux actuels dans COMPETENCY_LEVELS_QUERY)
comme entrée de GapEngine.
""")

pd.set_option("display.width", 200)
