import json
import re
from pathlib import Path

# Load extracted entities
data = json.loads(Path('scripts/extracted_entities.json').read_text(encoding='utf-8'))
puml_txt = Path('rapport-pfe/figures/plantuml-src/class_global_d2f_complet.puml').read_text(encoding='utf-8')

# Extract relations from PUML
# e.g.: Formation "1" *-- "1..*" SeanceFormation
# e.g.: User "*" -- "1..*" Role
rel_lines = []
for line in puml_txt.splitlines():
    line = line.strip()
    if not line or line.startswith("'") or line.startswith('@') or line.startswith('skinparam') or line.startswith('title') or line.startswith('package') or line.startswith('abstract') or line.startswith('class') or line.startswith('enum') or line.startswith('hide') or line.startswith('legend') or line.startswith('endlegend'):
        continue
    if any(op in line for op in ['--', '*--', 'o--', '..>', '<|--']):
        rel_lines.append(line)

print("=== PUML RELATIONSHIPS ===")
for r in rel_lines:
    print(r)

print("\n=== JPA RELATIONSHIPS IN CODE ===")
for svc, sdata in data.items():
    for ent in sdata['entities']:
        cname = ent['class']
        for fld in ent['fields']:
            rel_anns = [a for a in fld['annotations'] if any(k in a for k in ['OneToMany', 'ManyToOne', 'ManyToMany', 'OneToOne', 'JoinColumn', 'JoinTable'])]
            if rel_anns:
                print(f"{cname}.{fld['name']} : {fld['type']} -> {' '.join(rel_anns)}")
