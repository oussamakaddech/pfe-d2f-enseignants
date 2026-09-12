import hashlib
import json
import os
import pandas as pd
import numpy as np

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def canonical_hash(df):
    c = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    return hashlib.sha256(c.to_csv(index=False).encode('utf-8')).hexdigest()

def analyze(path, label):
    print(f"\n{'='*72}")
    print(f"ANALYSE: {label}")
    print(f"FILE: {path}")
    df = pd.read_csv(path)
    print(f"  shape: {df.shape}")
    print(f"  version: {df['dataset_version'].unique() if 'dataset_version' in df.columns else 'N/A'}")
    print(f"  canonical_hash: {canonical_hash(df)}")

    if 'date_t' in df.columns:
        dates = pd.to_datetime(df['date_t'], errors='coerce')
        print(f"  date_t sorted: {dates.is_monotonic_increasing}")
        print(f"  date_t min: {dates.min()}, max: {dates.max()}")
        print(f"  date_t nunique: {dates.nunique()}")

    # Dtype target
    if 'gap_next_3m' in df.columns:
        print(f"  gap_next_3m dtype: {df['gap_next_3m'].dtype}")
        print(f"  gap_next_3m describe: {df['gap_next_3m'].describe().to_dict()}")
        print(f"  gap_next_3m missing: {df['gap_next_3m'].isna().sum()}")

    # Full row duplicates
    print(f"  exact duplicates: {df.duplicated().sum()}")

    # Functional duplicates
    for key in [['teacher_id', 'competence_id', 'ref_month'],
                ['teacher_id', 'competence_id', 'date_t'],
                ['teacher_id', 'competence_id']]:
        if all(c in df.columns for c in key):
            n = int(df.duplicated(subset=key).sum())
            print(f"  functional dups on {key}: {n}")

    # Missing values
    missing = {c: int(df[c].isna().sum()) for c in df.columns if df[c].isna().any()}
    print(f"  missing values: {missing}")

    # Source
    for c in ['source_type', 'source_id', 'is_synthetic', 'created_at', 'dataset_version']:
        if c in df.columns:
            nun = df[c].nunique()
            print(f"  {c}: nunique={nun}")
            if nun < 20:
                print(f"    values: {df[c].value_counts().head(10).to_dict()}")

    # Level ranges
    for c in ['current_level_t', 'current_level_t1', 'current_level_t2', 'current_level_t3']:
        if c in df.columns:
            print(f"  {c}: min={df[c].min()}, max={df[c].max()}")

    # teachers and comps
    for c in ['teacher_id', 'competence_id']:
        if c in df.columns:
            print(f"  {c} nunique: {df[c].nunique()}")

    # months
    if 'ref_month' in df.columns:
        print(f"  ref_month min: {df['ref_month'].min()}, max: {df['ref_month'].max()}")

files = [
    ('data/clean/training_corpus_provenanced.csv', 'Dataset v1.0.0 provenance'),
    ('data/clean/training_corpus_clean.csv', 'Dataset v1.1.0 clean'),
    ('data/clean/training_corpus_provenanced_v110.csv', 'Dataset v1.1.0 provenance'),
]
for rel, label in files:
    p = os.path.join(BASE, rel)
    if os.path.exists(p):
        analyze(p, label)
    else:
        print(f"\nFILE MISSING: {rel}")