import hashlib
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

artefacts = [
    'data/models/gap_predictor_temporal.joblib',
    'data/models/gap_predictor_temporal_v110.joblib',
    'data/models/gap_predictor.joblib',
]

print("=== ARTEFACTS SHA-256 ===")
for rel in artefacts:
    p = os.path.join(BASE, rel)
    if os.path.exists(p):
        print(f"{rel}: {sha256_file(p)}")
    else:
        print(f"{rel}: MISSING")

print("\n=== SIDECARS ===")
for rel in ['data/models/gap_predictor_temporal.joblib.sha256',
            'data/models/gap_predictor_temporal_v110.joblib.sha256',
            'data/models/gap_predictor.joblib.sha256']:
    p = os.path.join(BASE, rel)
    if os.path.exists(p):
        print(f"{rel}: {open(p).read().strip()}")
    else:
        print(f"{rel}: MISSING")

print("\n=== DATASETS ===")
datasets = [
    'data/clean/training_corpus.csv',
    'data/clean/training_corpus_clean.csv',
    'data/clean/training_corpus_provenanced.csv',
    'data/clean/training_corpus_provenanced_v110.csv',
    'data/clean/training_corpus_from_db.csv',
    'data/clean/training_corpus_from_db_v110.csv',
]
for rel in datasets:
    p = os.path.join(BASE, rel)
    if os.path.exists(p):
        print(f"{rel}: {sha256_file(p)}")
    else:
        print(f"{rel}: MISSING")

print("\n=== REGISTRY ===")
reg_path = os.path.join(BASE, 'data/models/model_registry.json')
if os.path.exists(reg_path):
    reg = json.load(open(reg_path))
    for m in reg:
        print(f"{m['model_version']} ({m['model_name']}): status={m['status']}, dataset_hash={m['dataset_hash']}, artifact_sha256={m['artifact_sha256']}")