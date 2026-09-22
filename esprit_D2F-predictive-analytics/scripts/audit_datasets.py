import pandas as pd
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def audit_dataset(path):
    print(f"\n{'='*70}")
    print(f"FICHIER: {path}")
    if not os.path.exists(path):
        print("  MISSING")
        return
    df = pd.read_csv(path)
    print(f"  Shape: {df.shape}")
    print(f"  Colonnes: {list(df.columns)}")
    print(f"  dataset_version: {df['dataset_version'].unique() if 'dataset_version' in df.columns else 'N/A'}")
    print(f"  source_type: {df['source_type'].value_counts().to_dict() if 'source_type' in df.columns else 'N/A'}")
    print(f"  is_synthetic: {df['is_synthetic'].value_counts().to_dict() if 'is_synthetic' in df.columns else 'N/A'}")
    print(f"  teacher_id distincts: {df['teacher_id'].nunique() if 'teacher_id' in df.columns else 'N/A'}")
    print(f"  competence_id distincts: {df['competence_id'].nunique() if 'competence_id' in df.columns else 'N/A'}")
    if 'ref_month' in df.columns:
        print(f"  ref_month min/max: {df['ref_month'].min()} / {df['ref_month'].max()}")
    if 'date_t' in df.columns:
        print(f"  date_t min/max: {df['date_t'].min()} / {df['date_t'].max()}")
    if all(c in df.columns for c in ['teacher_id', 'competence_id', 'ref_month']):
        dup = df.duplicated(subset=['teacher_id', 'competence_id', 'ref_month']).sum()
        print(f"  Doublons fonctionnels (teacher_id, competence_id, ref_month): {dup}")
    if 'is_synthetic' in df.columns:
        real = (~df['is_synthetic'].astype(bool)).sum()
        print(f"  Lignes réelles: {real}, Lignes synthétiques: {df['is_synthetic'].astype(bool).sum()}")
    if 'source_type' in df.columns:
        print(f"  Source types: {df['source_type'].value_counts().to_dict()}")
    if 'source_id' in df.columns:
        print(f"  source_id NULL/NA: {df['source_id'].isna().sum()}")

datasets = [
    'data/clean/training_corpus.csv',
    'data/clean/training_corpus_clean.csv',
    'data/clean/training_corpus_provenanced.csv',
    'data/clean/training_corpus_provenanced_v110.csv',
    'data/clean/training_corpus_from_db.csv',
    'data/clean/training_corpus_from_db_v110.csv',
]

for d in datasets:
    audit_dataset(os.path.join(BASE, d))