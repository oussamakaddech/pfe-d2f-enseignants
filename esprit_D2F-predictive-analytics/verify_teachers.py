"""Contrôle multi-enseignants : scope + gaps + risque après V15/V16.

Usage (dans le conteneur d2f-predictive-analytics) :
    python /tmp/verify_teachers.py
"""
import json

from app.core.config import get_settings
from app.infrastructure.container import Container

TEACHERS = [
    "ENS903",  # Fatma Jlassi — DEPT_IA (aucun niveau enregistré)
    "ENS023",  # Fatma Haddad — DEPT_IA (niveaux IT enregistrés)
    "ENS025",  # DEPT_IA (niveaux IT enregistrés)
    "ENS021",  # DEPT_IA (niveaux IT enregistrés)
    "ENS015",  # Sihem Mroueh — DEPT_GC (vérif. V15)
    "ENS_GC1",  # DEPT_GC (aucun niveau)
    "ENS901",  # Salma Ben Youssef — DEPT_INFO (aucun niveau)
    "ENS902",  # Karim Maalej — DEPT_GL (aucun niveau)
    "E00007",  # Oussama KADDECH — DEPT_WEB (vide -> fallback explicite)
    "ENS001",  # Karim Trabelsi — DEPT_RT (niveaux)
]


def main() -> None:
    settings = get_settings()
    container = Container(settings)
    container.database.connect()

    for tid in TEACHERS:
        teacher = container.teacher_source.get_teacher(tid)
        if teacher is None:
            print(f"\n=== {tid}: INCONNU ===")
            continue
        analysis = container.analyze_teacher_scope.execute(teacher)
        scope = analysis.scope
        print(f"\n=== {tid} {teacher.prenom} {teacher.nom} — {teacher.dept_libelle or teacher.dept_id} ===")
        print(f"  Scope: {scope.type} '{scope.label}' fallback={scope.fallback} "
              f"([{analysis.scoped_competencies_count}/{analysis.total_competencies} compétences])")
        if scope.fallback:
            print(f"  fallback_reason: {scope.fallback_reason}")
        mel_dep = scope.type
        for g in analysis.gaps:
            sev = g.severity.value if hasattr(g.severity, "value") else g.severity
            print(f"    - {g.competence_code:<12} {g.competence_nom:<32} actuel={g.observed_result:.2f} "
                  f"requis={g.knowledge_difficulty_level:.0f} score={g.gap_score:.3f} {sev}")
        if not analysis.gaps:
            print("    (aucun gap > 0)")
        print(f"  Recommandations: {len(analysis.recommendations)}")
        for r in analysis.recommendations:
            d = r.to_dict()
            print(f"      - {d.get('formation_titre') or d.get('formation_id')} score={r.rank_score:.3f}")


if __name__ == "__main__":
    main()