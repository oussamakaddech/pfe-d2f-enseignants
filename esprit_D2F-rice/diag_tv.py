"""Quick diagnostic script for the TV fiche extraction."""
import os, re, sys, importlib, types

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

# Create a minimal rice package stub to avoid importing rice/__init__.py
# which pulls in sentence_transformers/torch
rice_pkg = types.ModuleType("rice")
rice_pkg.__path__ = [os.path.join(os.path.dirname(__file__), "rice")]
sys.modules["rice"] = rice_pkg

from rice.nlp import _extract_acquis_apprentissage, _extract_metadata, _extract_seances

text = open("test_fiche_tv.txt", encoding="utf-8").read()

print("=== METADATA ===")
meta = _extract_metadata(text)
for k, v in meta.items():
    print(f"  {k}: {v}")

print("\n=== ACQUIS ===")
acquis = _extract_acquis_apprentissage(text)
print(f"  Count: {len(acquis)}")
for a in acquis:
    print(f"  {a}")

print("\n=== SEANCES ===")
seances = _extract_seances(text)
print(f"  Count: {len(seances)}")
for s in seances:
    title = s.get("title", s.get(1, ""))
    print(f"  {s}")
