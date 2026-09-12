"""Resout de facon robuste model_name dans train_gap_model.py (regex)."""
import json
import pathlib
import re

p = pathlib.Path("pipelines/train_gap_model.py")
s = p.read_text(encoding="utf-8")

# 1. Constante MODEL_NAME apres MODEL_PATH si absente.
if not re.search(r'^MODEL_NAME = "gap_predictor_temporal"', s, re.M):
    s2 = re.sub(
        r'(MODEL_PATH = MODELS_DIR / "gap_predictor_temporal\.joblib"\n)',
        r'\1MODEL_NAME = "gap_predictor_temporal"\n',
        s, count=1,
    )
    assert s2 != s, "MODEL_PATH line introuvable"
    s = s2

# 2. metadata: model_name=identite ; algorithm=famille.
new_block = (
    '        "model_name": MODEL_NAME,\n'
    '        "algorithm": best_name,\n'
    '        "model_version": model_version,'
)
s2 = re.sub(
    r'"model_name":\s*best_name,\s*\n\s*"model_version":\s*model_version,',
    new_block,
    s, count=1,
)
assert s2 != s, "bloc metadata model_name introuvable"
s = s2

p.write_text(s, encoding="utf-8")

# Verif
check = open(p, encoding="utf-8").read()
print("MODEL_NAME const =", bool(re.search(r'^MODEL_NAME = "gap_predictor_temporal"', check, re.M)))
m = re.search(r'"model_name":\s*([^,\n]+)', check)
print("metadata model_name field =", m.group(1).strip() if m else None)
al = re.search(r'"algorithm":\s*([^,\n]+)', check)
print("metadata algorithm field =", al.group(1).strip() if al else None)
