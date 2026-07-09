#!/usr/bin/env python3
import os, re
ROOT = r"C:\Users\oussama\Desktop\pfe-d2f-enseignants"
tex_path = os.path.join(ROOT, "rapport-pfe", "rapport.tex")
with open(tex_path, encoding="utf-8") as f:
    text = f.read()

# \figplace{f}{caption}{label}{width}
figplace = re.findall(r"\\figplace\{([^}]*)\}\{[^}]*\}\{([^}]*)\}\{([^}]*)\}", text)
# \includegraphics[opts]{path}
inc = re.findall(r"\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}", text)

print("=== \\figplace ({} occurrences) ===".format(len(figplace)))
missing_fp = []
for filename, label, width in figplace:
    p = os.path.join(ROOT, "rapport-pfe", "figures", filename)
    ok = os.path.exists(p)
    print("  [{0}] {1:35s} label={2:25s} w={3}".format(
        "OK" if ok else "MANQUE", filename, label, width))
    if not ok:
        missing_fp.append(filename)

print()
print("=== \\includegraphics hors \\figplace ({} occurrences) ===".format(len(inc)))
for f in inc:
    # try a few resolutions
    candidates = [f, os.path.join(ROOT, "rapport-pfe", f),
                  os.path.join(ROOT, "rapport-pfe", "figures", f),
                  os.path.join(ROOT, f)]
    if not os.path.isabs(f) and "/" not in f and "\\" not in f:
        # bare name -> figures/
        candidates.append(os.path.join(ROOT, "rapport-pfe", "figures", f))
    resolved = next((c for c in candidates if os.path.exists(c)), None)
    print("  [{0}] {1}".format("OK" if resolved else "MANQUE", f))
    if not resolved:
        for c in candidates:
            print("        essai: " + c)

# Checks for chapter 8 tests section presence
print()
print("=== Section 8 (Tests) — présence du contenu attendu ===")
markers = [
    "Pyramide de tests",
    "JaCoCo",
    "SonarQube",
    "Matrice de tra\u00e7abilit\u00e9",
    "V\u00e9rification des diagrammes de cas d'utilisation",
]
for m in markers:
    print("  [{0}] {1}".format("OK" if m in text else "ABSENT", m))

# Diagrammes UC \figplace + labels attendus (uc_sprint*, uc_global)
print()
print("=== Diagrammes UC — labels && fichiers ===")
uc_labels = ["fig:uc_s1", "fig:uc_s2", "fig:uc_s3", "fig:uc_s4", "fig:uc_s5", "fig:uc_global"]
for lab in uc_labels:
    referenced = ("\\ref{" + lab + "}") in text or lab in text
    print("  {0:18s} ref.present={1}".format(lab, "OUI" if referenced else "non"))

# UC use-case descriptions count
uc_desc = re.findall(r"\\subsection\*\{Cas d'utilisation", text)
print("  \\subsection* 'Cas d utilisation' =", len(uc_desc))
