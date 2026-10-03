import glob
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

# Tous les artefacts presents (plus de liste en dur : elle citait un artefact
# orphelin supprime le 2026-10-01). Chaque sidecar est compare a l'artefact.
artefacts = sorted(
    os.path.relpath(p, BASE).replace(os.sep, '/')
    for p in glob.glob(os.path.join(BASE, 'data', 'models', '**', '*.joblib'), recursive=True)
)

print("=== ARTEFACTS SHA-256 / SIDECARS ===")
for rel in artefacts:
    digest = sha256_file(os.path.join(BASE, rel))
    sidecar = os.path.join(BASE, rel + '.sha256')
    if os.path.exists(sidecar):
        etat = 'OK' if open(sidecar).read().strip()[:64] == digest else 'SIDECAR DIFFERENT'
    else:
        etat = 'SIDECAR MISSING'
    print(f"{rel}: {digest} [{etat}]")

print("\n=== DATASETS ===")
datasets = [
    'data/clean/training_corpus_provenanced.csv',
    'data/clean/training_corpus_from_db.csv',
    'data/clean/simulation_dataset.csv',
    'data/simulation/simulation_dataset_risk_n400_seed2026.csv',
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