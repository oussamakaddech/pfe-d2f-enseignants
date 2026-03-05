import sys, re
sys.path.insert(0, '.')
from rice.nlp import _RE_ENSEIGNANTS

txt = open('test_fiche_tv.txt', encoding='utf-8').read()
m = _RE_ENSEIGNANTS.search(txt)
if m:
    print("Group1:", repr(m.group(1)))
    pos = m.end()
    after = txt[pos:pos+100]
    print("After match:", repr(after))
    # Simulate _grab_continuation
    raw = m.group(1).strip()
    remainder = txt[pos:]
    for i, cont_line in enumerate(remainder.split("\n")):
        cl = cont_line.strip()
        print(f"  cont[{i}]: {repr(cl)}")
        if not cl:
            print("  -> BREAK: empty")
            break
        if i > 5:
            break
        raw += " " + cl
    print("Final raw:", repr(raw))
else:
    print("No match!")
