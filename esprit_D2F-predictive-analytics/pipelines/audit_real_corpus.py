"""Audit de qualité du corpus réel (217 lignes) : manquants, doublons, zeros, outliers."""
import pandas as pd
import numpy as np

df = pd.read_csv("data/clean/training_corpus_from_db.csv")
print("lignes:", len(df), "| colonnes:", len(df.columns))
print()

# 1. Manquants
miss = df.isna().sum()
miss = miss[miss > 0]
print("=== VALEURS MANQUANTES ===")
print(miss.to_string() if len(miss) else "aucune")
print()

# 2. Doublons
print("doublons exacts:", df.duplicated().sum())
key_dupes = df.duplicated(subset=["teacher_id", "competence_id", "date_t"])
print("doublons (teacher, competence, date):", key_dupes.sum())
print()

# 3. Zéros par colonne (infos rares/absentes)
feat_cols = [c for c in df.columns if c not in
             ("teacher_id", "competence_id", "competence_code", "ref_month", "date_t",
              "target_observation_date", "created_at", "gap_next_3m", "data_origin",
              "is_extrapolated", "source_type", "source_id")]
print("=== PART DE ZEROS PAR COLONNE (>50% = feature quasi vide) ===")
for c in feat_cols:
    z = (df[c] == 0).mean()
    if z > 0.5:
        print("  %-30s %5.1f%% de zeros   (moy=%.3f, non-nul moy=%.3f)"
              % (c, z * 100, df[c].mean(), df[c][df[c] != 0].mean() if (df[c] != 0).any() else float("nan")))
print()

# 4. Outliers (IQR)
print("=== OUTLIERS (hors 1.5*IQR) ===")
for c in feat_cols:
    if not np.issubdtype(df[c].dtype, np.number):
        continue
    q1, q3 = df[c].quantile([0.25, 0.75])
    iqr = q3 - q1
    if iqr == 0:
        continue
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    n_out = ((df[c] < lo) | (df[c] > hi)).sum()
    if n_out > 0:
        print("  %-30s %3d outliers (%4.1f%%)  plage IQR=[%.1f, %.1f], max reel=%.1f"
              % (c, n_out, 100 * n_out / len(df), lo, hi, df[c].max()))
print()

# 5. Coherences metier
print("=== INCOHERENCES METIER ===")
bad_level = df[[c for c in df.columns if c.startswith("current_level_t")]].apply(
    lambda s: ((s < 1) | (s > 5)).sum()).sum()
print("niveaux hors [1,5]:", bad_level)
bad_gap = ((df["gap_next_3m"] < 0) | (df["gap_next_3m"] > 5)).sum()
print("gap_next_3m hors [0,5]:", bad_gap)
neg_days = (df["days_since_last_training"] < 0).sum()
print("days_since_last_training negatifs:", neg_days)
eng = df["engagement_score"]
print("engagement_score: min=%.2f max=%.2f (le simule va de 0 a 1)" % (eng.min(), eng.max()))
