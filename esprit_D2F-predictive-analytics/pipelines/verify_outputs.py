"""Vérifie tous les fichiers de sortie requis."""
import hashlib
from pathlib import Path

import pandas as pd

required_files = [
    "reports/dataset_audit_before.json",
    "reports/dataset_audit_before.md",
    "reports/dataset_cleaning_report.json",
    "reports/dataset_cleaning_report.md",
    "reports/duplicate_conflicts.csv",
    "reports/removed_or_quarantined_rows.csv",
    "reports/feature_dictionary.json",
    "reports/feature_leakage_report.json",
    "reports/model_comparison.json",
    "reports/model_comparison.csv",
    "reports/model_comparison.md",
    "reports/model_validation_final.md",
    "reports/rapport_final.md",
    "data/clean/training_corpus_clean.csv",
]

print("=== FICHIERS REQUIS ===")
all_ok = True
for f in required_files:
    p = Path(f)
    if p.exists():
        size = p.stat().st_size
        print(f"  [OK] {f} ({size} octets)")
    else:
        print(f"  [MANQUANT] {f}")
        all_ok = False

print()
print("=== DATASET FINAL ===")
df = pd.read_csv("data/clean/training_corpus_clean.csv")
canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
h = hashlib.sha256(canonical.to_csv(index=False).encode("utf-8")).hexdigest()
print(f"  lignes={len(df)}")
print(f"  enseignants={df['teacher_id'].nunique()}")
print(f"  competences={df['competence_id'].nunique()}")
print(f"  hash={h}")
print(f"  version={df['dataset_version'].iloc[0]}")

print()
print(f"=== VERDICT: {'TOUS LES FICHIERS PRESENTS' if all_ok else 'FICHIERS MANQUANTS'} ===")