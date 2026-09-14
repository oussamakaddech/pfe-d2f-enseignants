"""Vérification ENS015 : scope-analysis (gaps + reco) et santé ML — via Container DI."""
import json

from app.core.config import get_settings
from app.infrastructure.container import Container


def dump(obj, limit=4000):
    return json.dumps(obj, indent=2, ensure_ascii=False, default=str)[:limit]


settings = get_settings()
container = Container(settings)
container.database.connect()

teacher = container.teacher_source.get_teacher("ENS015")
print("Enseignant:", teacher.full_name, "| UP:", teacher.up_id, "| Dept:", teacher.dept_id)

status = container.model_port.status()
print("\n=== ML STATUS ===")
print(dump(status, 5000))

analysis = container.analyze_teacher_scope.execute(teacher)
scope = analysis.scope
print("\n=== SCOPE ANALYSIS ENS015 ===")
print("Scope type:", scope.type, "| label:", scope.label,
      "| fallback:", scope.fallback, "| reason:", scope.fallback_reason)
print("Compétences du périmètre:", analysis.scoped_competencies_count, "/", analysis.total_competencies)
print("Gaps (%d):" % len(analysis.gaps))
for g in analysis.gaps:
    print("  -", g.competence_code, g.competence_nom,
          "| actuel=%.2f" % g.observed_result,
          "| requis=%.0f" % g.knowledge_difficulty_level,
          "| score=%.2f" % g.gap_score,
          "| urgence=", g.severity.value if hasattr(g.severity, "value") else g.severity,
          "| tendance=", g.trend.value if hasattr(g.trend, "value") else g.trend)
print("Recommandations (%d):" % len(analysis.recommendations))
for r in analysis.recommendations:
    d = r.to_dict()
    print("  -", d.get("formation_titre") or d.get("formation_id"),
          "| score=%.3f" % (r.rank_score if hasattr(r, "rank_score") else -1))

risk, mode, version, reason, payload = container.compute_risk.execute_serving("ENS015")
print("\n=== RISQUE ENS015 ===")
d = risk.to_dict(mode) if hasattr(risk, "to_dict") else vars(risk)
print("Mode:", mode, "| version:", version, "| fallback_reason:", reason)
print(dump(d, 3000))
