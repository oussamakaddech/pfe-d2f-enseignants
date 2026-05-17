import re

fp = "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/evaluation/EvaluationGlobalePage.jsx"

c = open(fp, "r", encoding="utf-8").read()

pattern = r"const RECO_COLORS = \{.*?export default"

replacement = """const RECO_COLORS = {
  EXCELLENTE: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Excellente" },
  A_CONTINUER: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "A continuer" },
  A_AMELIORER: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "A ameliorer" },
  A_ARRETER: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "A arreter" },
};

export default"""

c = re.sub(pattern, replacement, c, flags=re.DOTALL)

open(fp, "w", encoding="utf-8").write(c)

print("Done!")
