import json
import re
from pathlib import Path

# Load extracted data
data = json.loads(Path('scripts/extracted_entities.json').read_text(encoding='utf-8'))

# Read puml
puml_txt = Path('rapport-pfe/figures/plantuml-src/class_global_d2f_complet.puml').read_text(encoding='utf-8')

# Extract enums from PUML
puml_enums = {}
for m in re.finditer(r'enum\s+(\w+)\s*(?:<<[^>]+>>)?\s*\{([^}]+)\}', puml_txt):
    ename = m.group(1)
    evals = [v.strip() for v in m.group(2).split('\n') if v.strip() and not v.strip().startswith("'")]
    puml_enums[ename] = evals

# Collect all Java enums
all_java_enums = {}
for svc, sdata in data.items():
    for ename, evals in sdata['enums'].items():
        all_java_enums[ename] = {'service': svc, 'values': evals}

print("=== COMPARISON OF ENUMS ===")
for ename, pevals in puml_enums.items():
    if ename in all_java_enums:
        jevals = all_java_enums[ename]['values']
        svc = all_java_enums[ename]['service']
        diff_puml = set(pevals) - set(jevals)
        diff_java = set(jevals) - set(pevals)
        print(f"\nEnum: {ename} (Service: {svc})")
        print(f"  PUML values: {pevals}")
        print(f"  Java values: {jevals}")
        if diff_puml:
            print(f"  [WARN] In PUML but NOT in Java: {diff_puml}")
        if diff_java:
            print(f"  [INFO] In Java but NOT in PUML: {diff_java}")
        if not diff_puml and not diff_java:
            print(f"  [OK] EXACT MATCH!")
    else:
        print(f"\nEnum: {ename} NOT FOUND in Java code!")

