import os
import re
import json
from pathlib import Path

def remove_annotations(stmt):
    # Regex to handle up to 2 levels of nested parentheses in annotations
    ann_pattern = re.compile(r'@\w+(?:\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\))?')
    anns = ann_pattern.findall(stmt)
    decl = ann_pattern.sub('', stmt)
    return anns, decl

def extract_detailed_entity(filepath):
    txt = filepath.read_text(encoding='utf-8', errors='ignore')
    if '@Entity' not in txt and '@MappedSuperclass' not in txt:
        return None

    # Check class declaration
    m_class = re.search(r'public\s+(?:abstract\s+)?class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+([\w<>]+))?(?:\s+implements\s+([\w<>,\s]+))?\s*\{', txt)
    if not m_class:
        return None
    
    cname = m_class.group(1)
    super_name = m_class.group(2)
    implements_str = m_class.group(3)
    is_mapped = '@MappedSuperclass' in txt

    class_start = m_class.end()
    class_body = txt[class_start:]

    # Remove comments
    clean_txt = re.sub(r'//.*', '', class_body)
    clean_txt = re.sub(r'/\*.*?\*/', '', clean_txt, flags=re.DOTALL)

    has_field_defaults = 'FieldDefaults' in txt

    statements = clean_txt.split(';')
    fields = []

    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        if '{' in stmt or '}' in stmt:
            continue

        ann_matches, decl = remove_annotations(stmt)
        decl = decl.strip()
        decl = re.sub(r'\s+', ' ', decl)
        
        # Remove initialization (= ...)
        if '=' in decl:
            decl = decl.split('=')[0].strip()

        if '(' in decl or ')' in decl:
            continue

        parts = decl.split()
        if not parts:
            continue

        if 'static' in parts:
            continue

        fname = parts[-1]
        rem = parts[:-1]
        vis = 'private' if has_field_defaults else 'package-private'
        if rem and rem[0] in ['private', 'protected', 'public']:
            vis = rem[0]
            rem = rem[1:]
        
        rem = [p for p in rem if p not in ['transient', 'volatile', 'final', 'Builder.Default']]

        if not rem:
            continue

        ftype = ' '.join(rem)

        if fname in ['log', 'logger', 'serialVersionUID', 'class', 'return']:
            continue
        if ftype in ['class', 'interface', 'enum', 'return']:
            continue

        fields.append({
            'name': fname,
            'type': ftype,
            'visibility': vis,
            'annotations': ann_matches
        })

    return {
        'class': cname,
        'extends': super_name,
        'implements': implements_str,
        'is_mapped_superclass': is_mapped,
        'file': str(filepath.resolve()),
        'fields': fields
    }

def extract_enums(service_path):
    enums = {}
    for f in service_path.rglob('*.java'):
        if 'src/test' in str(f).replace('\\', '/'):
            continue
        txt = f.read_text(encoding='utf-8', errors='ignore')
        for m_enum in re.finditer(r'public\s+enum\s+(\w+)\s*\{([^}]+)\}', txt):
            ename = m_enum.group(1)
            body = m_enum.group(2)
            body = re.sub(r'//.*', '', body)
            body = re.sub(r'/\*.*?\*/', '', body, flags=re.DOTALL)
            vals_part = body.split(';')[0]
            vals = [re.sub(r'\(.*?\)', '', v).strip() for v in vals_part.split(',') if v.strip()]
            enums[ename] = [v for v in vals if re.match(r'^[A-Z0-9_]+$', v)]
    return enums

def main():
    root = Path('.')
    services = [d for d in root.iterdir() if d.is_dir() and d.name.startswith('esprit_D2F-') and d.name != 'esprit_D2F-webapp']
    
    all_data = {}
    for svc in sorted(services, key=lambda s: s.name):
        entities = []
        for f in svc.rglob('*.java'):
            if 'src/test' in str(f).replace('\\', '/'):
                continue
            parsed = extract_detailed_entity(f)
            if parsed:
                entities.append(parsed)
        enums = extract_enums(svc)
        all_data[svc.name] = {
            'entities': entities,
            'enums': enums
        }

    Path('scripts/extracted_entities.json').write_text(json.dumps(all_data, indent=2, ensure_ascii=False), encoding='utf-8')
    print("Extracted successfully!")

if __name__ == '__main__':
    main()
