import re
from pathlib import Path
import json

py_script = Path('rapport-pfe/figures/diagrams-src/gen_class_global_d2f.py').read_text(encoding='utf-8')
data = json.loads(Path('scripts/extracted_entities.json').read_text(encoding='utf-8'))

# Map class to fields in code
java_classes = {}
for svc, sdata in data.items():
    for ent in sdata['entities']:
        java_classes[ent['class']] = {f['name']: f['type'] for f in ent['fields']}

# Find CLASSES dict in gen_class_global_d2f.py
m = re.search(r'CLASSES\s*=\s*\{([\s\S]*?)\n\}\n', py_script)
py_classes = {}
if m:
    for block in re.finditer(r'"(\w+)":\s*\(\s*\d+,\s*\d+,\s*\d+,\s*"[^"]+",\s*\[(.*?)\]\s*,\s*\[(.*?)\]\s*\)', m.group(1), re.DOTALL):
        cname = block.group(1)
        flds_raw = [x.strip(' "\'\n\r') for x in block.group(2).split(',') if x.strip(' "\'\n\r')]
        meths_raw = [x.strip(' "\'\n\r') for x in block.group(3).split(',') if x.strip(' "\'\n\r')]
        py_classes[cname] = {'fields': flds_raw, 'methods': meths_raw}

print(f"Found {len(py_classes)} classes in gen_class_global_d2f.py")
for cname, pinfo in py_classes.items():
    print(f"\n--- Class: {cname} ---")
    if cname in java_classes:
        code_fields = java_classes[cname]
        for f in pinfo['fields']:
            fname = f.split(':')[0].strip()
            ftype = f.split(':')[1].strip() if ':' in f else ''
            if fname in code_fields:
                print(f"  [OK] {fname} : {ftype} (code: {code_fields[fname]})")
            else:
                print(f"  [MISSING IN CODE] {fname} : {ftype}")
    elif cname == 'BaseAuditEntity':
        print(f"  [OK] BaseAuditEntity fields: {pinfo['fields']}")
    else:
        print(f"  [NOT IN JAVA ENTITIES] {cname}")
