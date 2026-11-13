import json
import re
from pathlib import Path

# Load extracted entities from Java code
entities_data = json.loads(Path('scripts/extracted_entities.json').read_text(encoding='utf-8'))

# Parse class_global_d2f_complet.puml
puml_path = Path('rapport-pfe/figures/plantuml-src/class_global_d2f_complet.puml')
puml_txt = puml_path.read_text(encoding='utf-8')

# Extract classes from PUML
# Match: class Name { ... }
puml_classes = {}
class_blocks = re.findall(r'(?:abstract\s+)?class\s+"?([^"{\s]+)"?(?:\s+as\s+\w+)?\s*\{([^}]*)\}', puml_txt)
for cname, body in class_blocks:
    fields = []
    methods = []
    lines = [line.strip() for line in body.split('\n') if line.strip() and not line.strip().startswith("'")]
    in_methods = False
    for line in lines:
        if line == '--':
            in_methods = True
            continue
        if in_methods or '(' in line:
            m = re.match(r'([+\-#~])\s*(\w+)\s*\((.*?)\)', line)
            if m:
                methods.append({'vis': m.group(1), 'name': m.group(2), 'params': m.group(3)})
        else:
            m = re.match(r'([+\-#~])\s*(\w+)\s*:\s*(.+)', line)
            if m:
                fields.append({'vis': m.group(1), 'name': m.group(2), 'type': m.group(3).strip()})
    puml_classes[cname] = {
        'fields': fields,
        'methods': methods
    }

# Also parse gen_class_global_d2f.py (the report SVG diagram)
py_diag_path = Path('rapport-pfe/figures/diagrams-src/gen_class_global_d2f.py')
py_diag_txt = py_diag_path.read_text(encoding='utf-8')
# Find CLASSES = { ... }
py_classes = {}
m_py_classes = re.search(r'CLASSES\s*=\s*\{([\s\S]*?)\n\}\n', py_diag_txt)
if m_py_classes:
    for line in m_py_classes.group(1).splitlines():
        # "User": (60, 130, 280, "compte", ["id : String", ...], ["login()", ...]),
        m = re.search(r'"(\w+)":\s*\(\s*\d+,\s*\d+,\s*\d+,\s*"[^"]+",\s*\[(.*?)\]\s*,\s*\[(.*?)\]\s*\)', line)
        if m:
            cname = m.group(1)
            flds_raw = m.group(2)
            meth_raw = m.group(3)
            flds = [f.strip(' "\'') for f in flds_raw.split(',') if f.strip(' "\'')]
            meths = [me.strip(' "\'') for me in meth_raw.split(',') if me.strip(' "\'')]
            py_classes[cname] = {'fields': flds, 'methods': meths}

print(f"PUML classes parsed: {len(puml_classes)}")
print(f"PY diag classes parsed: {len(py_classes)}")

# Generate audit report
report_lines = []

report_lines.append("# AUDIT COMPARATIF COMPLET : CODE SOURCE vs DIAGRAMMES DE CLASSES\n")

# Flatten all Java entities by class name
java_entities_by_name = {}
for svc, data in entities_data.items():
    for ent in data['entities']:
        java_entities_by_name[ent['class']] = {
            'service': svc,
            'data': ent
        }

report_lines.append(f"Nombre total de classes entités/MappedSuperclass dans le code Java : {len(java_entities_by_name)}")
report_lines.append(f"Nombre de classes dans class_global_d2f_complet.puml : {len(puml_classes)}")
report_lines.append(f"Nombre de classes dans gen_class_global_d2f.py (SVG rapport) : {len(py_classes)}\n")

# Compare each PUML class with code
report_lines.append("## 1. VÉRIFICATION DÉTAILLÉE PAR CLASSE (PUML vs CODE SOURCE)\n")

for cname, puml_info in sorted(puml_classes.items()):
    report_lines.append(f"### Classe : `{cname}`")
    if cname in java_entities_by_name:
        code_info = java_entities_by_name[cname]['data']
        svc = java_entities_by_name[cname]['service']
        report_lines.append(f"- **Service Java** : `{svc}`")
        report_lines.append(f"- **Hérite de** : `{code_info['extends'] or 'Aucun'}`")
        
        # Attributes comparison
        puml_flds = {f['name']: f['type'] for f in puml_info['fields']}
        code_flds = {f['name']: f['type'] for f in code_info['fields']}
        
        # Check matched, missing in code, missing in diagram
        matched = []
        type_diff = []
        for fn, ft in puml_flds.items():
            if fn in code_flds:
                ct = code_flds[fn]
                if ft == ct or (ft in ct) or (ct in ft):
                    matched.append((fn, ft, ct))
                else:
                    type_diff.append((fn, ft, ct))
            else:
                # Check if it might be an association or named slightly differently
                pass
        
        missing_in_code = [fn for fn in puml_flds if fn not in code_flds]
        extra_in_code = [fn for fn in code_flds if fn not in puml_flds]
        
        report_lines.append(f"- **Attributs diagramme ({len(puml_flds)})** : `{', '.join(puml_flds.keys())}`")
        report_lines.append(f"- **Attributs code source ({len(code_flds)})** : `{', '.join(code_flds.keys())}`")
        
        if type_diff:
            report_lines.append("  - ⚠️ **Divergences de type** :")
            for fn, pt, ct in type_diff:
                report_lines.append(f"    - `{fn}` : Diagramme=`{pt}` vs Code=`{ct}`")
        
        if missing_in_code:
            report_lines.append(f"  - ℹ️ **Dans le diagramme mais absent du code Java** : `{missing_in_code}`")
        
        if extra_in_code:
            report_lines.append(f"  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `{extra_in_code}`")
            
    else:
        # Check if it's from predictive-analytics or base
        if cname in ['BaseAuditEntity', 'BaseAuth', 'BaseForm', 'BaseComp', 'BaseBes', 'BaseEval', 'BaseCert', 'BaseNotif']:
            report_lines.append(f"- **Type** : MappedSuperclass commune d'audit")
        elif cname in ['SkillGap', 'TeacherRiskSnapshot', 'Recommendation', 'AlertEvent']:
            report_lines.append(f"- **Module** : Analyse Prédictive (FastAPI/Python + PostgreSQL table `analyse.*`)")
            puml_flds = {f['name']: f['type'] for f in puml_info['fields']}
            report_lines.append(f"- **Attributs diagramme** : `{', '.join(puml_flds.keys())}`")
        else:
            report_lines.append(f"- ⚠️ **NON TROUVÉE DANS LE CODE SOURCE JAVA**")
    
    report_lines.append("")

# Classes in code NOT in PUML
classes_not_in_puml = [c for c in java_entities_by_name if c not in puml_classes and not c.startswith('Base')]
report_lines.append("## 2. CLASSES DU CODE JAVA NON PRÉSENTES DANS LE DIAGRAMME COMPLET\n")
for c in classes_not_in_puml:
    svc = java_entities_by_name[c]['service']
    fields = [f['name'] for f in java_entities_by_name[c]['data']['fields']]
    report_lines.append(f"- `{c}` (`{svc}`) : attributs = `{fields}`")

output_report = '\n'.join(report_lines)
Path('scripts/class_audit_report.md').write_text(output_report, encoding='utf-8')
print("Report generated: scripts/class_audit_report.md")
