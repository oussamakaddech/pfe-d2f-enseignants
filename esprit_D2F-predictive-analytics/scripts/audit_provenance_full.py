import hashlib
import json
import os
import pandas as pd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def canonical_dataset_hash(df):
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    return hashlib.sha256(canonical.to_csv(index=False).encode('utf-8')).hexdigest()

def raw_sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

print("=== HASH CANONIQUE PIPELINE (par toutes colonnes triées) ===")
for rel in ['data/clean/training_corpus_clean.csv',
            'data/clean/training_corpus_provenanced.csv',
            'data/clean/training_corpus_provenanced_v110.csv',
            'data/clean/training_corpus_from_db_v110.csv']:
    p = os.path.join(BASE, rel)
    if os.path.exists(p):
        df = pd.read_csv(p)
        h = canonical_dataset_hash(df)
        print(f"{rel}:")
        print(f"  raw_sha256 = {raw_sha256(p)}")
        print(f"  canonical  = {h}")
        print(f"  rows={len(df)}, version={df['dataset_version'].unique() if 'dataset_version' in df.columns else 'N/A'}")

print("\n=== REGISTRE DATASET HASH ===")
reg = json.load(open(os.path.join(BASE, 'data/models/model_registry.json')))
for m in reg:
    print(f"  v{m['model_version']}: dataset_hash = {m['dataset_hash']}")