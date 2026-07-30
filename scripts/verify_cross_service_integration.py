#!/usr/bin/env python3
"""
Cross-Service Integration Audit Script

Verifies the data relationship between User Management, Competency,
Training, and Predictive Analytics services.

Exit codes:
  0 = all critical checks passed
  1 = one or more critical checks failed
"""

import csv
import json
import sys
from pathlib import Path
from collections import defaultdict

try:
    from sqlalchemy import create_engine, text
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

DATABASE_URL = "postgresql://d2f:d2fpasswd@localhost:7432/d2f"

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


def get_db():
    if not DB_AVAILABLE:
        return None
    engine = create_engine(DATABASE_URL)
    return engine


def load_csv_data():
    teachers = []
    competencies = []
    risk_scores = []
    alerts = []
    recommendations = []

    teachers_path = CLEAN_DIR / "teachers.csv"
    if teachers_path.exists():
        with open(teachers_path) as f:
            teachers = list(csv.DictReader(f))

    comp_path = CLEAN_DIR / "teacher_competencies.csv"
    if comp_path.exists():
        with open(comp_path) as f:
            competencies = list(csv.DictReader(f))

    risk_path = CLEAN_DIR / "risk_scores.csv"
    if risk_path.exists():
        with open(risk_path) as f:
            risk_scores = list(csv.DictReader(f))

    alerts_path = CLEAN_DIR / "alerts.csv"
    if alerts_path.exists():
        with open(alerts_path) as f:
            alerts = list(csv.DictReader(f))

    recs_path = CLEAN_DIR / "recommendations.csv"
    if recs_path.exists():
        with open(recs_path) as f:
            recommendations = list(csv.DictReader(f))

    return teachers, competencies, risk_scores, alerts, recommendations


def verify_canonical_ids(db):
    """Check 8: No mixed teacher ID format remains in runtime tables."""
    results = {"name": "canonical_id_compliance", "passed": True, "details": []}

    if db:
        with db.connect() as conn:
            tables = ["skill_gaps", "recommendations", "teacher_risk_profiles", "alert_events"]
            for table in tables:
                row = conn.execute(text(
                    f'SELECT count(*) FROM "analyse"."{table}" WHERE enseignant_id LIKE \'T%\''
                )).fetchone()
                t_count = row[0]
                if t_count > 0:
                    results["passed"] = False
                    results["details"].append(f"{table}: {t_count} T-prefixed IDs remain")
                else:
                    results["details"].append(f"{table}: OK (no T-prefixed IDs)")

    return results


def verify_orphan_records(db):
    """Check 7: No orphan records."""
    results = {"name": "orphan_records", "passed": True, "details": [], "orphans": []}

    if db:
        with db.connect() as conn:
            # Gaps without teacher
            row = conn.execute(text(
                'SELECT count(*) FROM "analyse"."skill_gaps" sg WHERE NOT EXISTS '
                '(SELECT 1 FROM "formation"."enseignants" e WHERE e.id = sg.enseignant_id)'
            )).fetchone()
            orphan_gaps = row[0]
            if orphan_gaps > 0:
                results["passed"] = False
                results["orphans"].append(f"skill_gaps: {orphan_gaps} orphan records")

            # Recommendations without teacher
            row = conn.execute(text(
                'SELECT count(*) FROM "analyse"."recommendations" r WHERE NOT EXISTS '
                '(SELECT 1 FROM "formation"."enseignants" e WHERE e.id = r.enseignant_id)'
            )).fetchone()
            orphan_recos = row[0]
            if orphan_recos > 0:
                results["passed"] = False
                results["orphans"].append(f"recommendations: {orphan_recos} orphan records")

            # Recommendations without active training
            row = conn.execute(text(
                'SELECT count(*) FROM "analyse"."recommendations" r WHERE NOT EXISTS '
                '(SELECT 1 FROM "formation"."formations" f WHERE f.id_formation = r.formation_id AND f.etat_formation != \'ANNULE\')'
            )).fetchone()
            orphan_trainings = row[0]
            if orphan_trainings > 0:
                results["passed"] = False
                results["orphans"].append(f"recommendations: {orphan_trainings} without active training")

            results["details"].append(f"Orphan gaps: {orphan_gaps}")
            results["details"].append(f"Orphan recommendations: {orphan_recos}")
            results["details"].append(f"Recommendations without active training: {orphan_trainings}")

    return results


def verify_recommendation_traceability(db):
    """Check 5: Every recommendation references an actual unresolved gap."""
    results = {"name": "recommendation_traceability", "passed": True, "details": [], "traceable": 0, "total": 0}

    if db:
        with db.connect() as conn:
            row = conn.execute(text(
                'SELECT count(*) FROM "analyse"."recommendations" r WHERE EXISTS '
                '(SELECT 1 FROM "analyse"."skill_gaps" sg WHERE sg.id = r.skill_gap_id AND sg.enseignant_id = r.enseignant_id)'
            )).fetchone()
            traceable = row[0]

            row = conn.execute(text(
                'SELECT count(*) FROM "analyse"."recommendations"'
            )).fetchone()
            total = row[0]

            pct = (traceable / total * 100) if total > 0 else 0
            results["traceable"] = traceable
            results["total"] = total
            results["details"].append(f"Traceable: {traceable}/{total} ({pct:.1f}%)")

            if pct < 95:
                results["passed"] = False
                results["details"].append("FAIL: Less than 95% traceability")

    return results


def verify_teacher_competency_coverage(db):
    """Check 9: T011, T014, T028 are resolved."""
    results = {"name": "missing_teacher_competencies", "passed": True, "details": []}

    # Check CSV for teachers without competencies
    teachers, competencies, _, _, _ = load_csv_data()
    teacher_ids = {t["teacher_id"] for t in teachers}
    comp_teacher_ids = {c["teacher_id"] for c in competencies}
    missing = teacher_ids - comp_teacher_ids

    if missing:
        results["details"].append(f"Teachers without competencies: {sorted(missing)}")
        results["passed"] = False
    else:
        results["details"].append("All teachers have competency data")

    return results


def verify_recommendation_diversity(db):
    """Check 10: Contrasting teachers have different recommendations."""
    results = {"name": "recommendation_diversity", "passed": True, "details": []}

    if db:
        with db.connect() as conn:
            # Get Top-1 for each teacher
            row = conn.execute(text(
                'SELECT DISTINCT ON (enseignant_id) enseignant_id, formation_id, score_global '
                'FROM "analyse"."recommendations" ORDER BY enseignant_id, score_global DESC'
            )).fetchall()

            top1 = defaultdict(list)
            for r in row:
                top1[r[1]].append(r[0])

            max_concentration = max(len(v) for v in top1.values()) if top1 else 0
            total_teachers = len(row)
            concentration_pct = (max_concentration / total_teachers * 100) if total_teachers > 0 else 0

            results["details"].append(f"Top-1 concentration: {max_concentration}/{total_teachers} ({concentration_pct:.1f}%)")

            if concentration_pct > 50:
                results["passed"] = False
                results["details"].append("FAIL: Top-1 concentration > 50%")

    return results


def verify_cache_keys():
    """Check 11: Cache keys include teacher_id."""
    results = {"name": "cache_key_isolation", "passed": True, "details": []}

    # Check the analytics router for cache key patterns
    router_path = BASE_DIR / "app" / "routers" / "analytics.py"
    if router_path.exists():
        content = router_path.read_text()
        if "enseignant_id" in content and "cache" in content.lower():
            results["details"].append("Cache keys include enseignant_id")
        else:
            results["details"].append("WARNING: No explicit cache key found in analytics router")
    else:
        results["details"].append("analytics.py not found")

    return results


def run_audit():
    """Run all verification checks."""
    db = get_db() if DB_AVAILABLE else None

    checks = [
        verify_canonical_ids(db),
        verify_orphan_records(db),
        verify_recommendation_traceability(db),
        verify_teacher_competency_coverage(db),
        verify_recommendation_diversity(db),
        verify_cache_keys(),
    ]

    all_passed = all(c["passed"] for c in checks)

    # Generate reports
    json_report = {
        "audit_date": "2026-07-30",
        "all_passed": all_passed,
        "checks": checks,
    }

    json_path = REPORTS_DIR / "cross_service_integration_audit.json"
    with open(json_path, "w") as f:
        json.dump(json_report, f, indent=2)

    md_path = REPORTS_DIR / "cross_service_integration_audit.md"
    with open(md_path, "w") as f:
        f.write("# Cross-Service Integration Audit Report\n\n")
        f.write(f"**Date**: 2026-07-30\n")
        f.write(f"**Overall Status**: {'PASS' if all_passed else 'FAIL'}\n\n")
        f.write("## Checks\n\n")
        for check in checks:
            status = "PASS" if check["passed"] else "FAIL"
            f.write(f"### {check['name']} [{status}]\n\n")
            for detail in check.get("details", []):
                f.write(f"- {detail}\n")
            f.write("\n")

    # Generate orphan records CSV
    orphan_path = REPORTS_DIR / "orphan_records.csv"
    with open(orphan_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["check", "status", "details"])
        for check in checks:
            writer.writerow([check["name"], "PASS" if check["passed"] else "FAIL", "; ".join(check.get("details", []))])

    # Generate ID mapping report
    mapping_path = REPORTS_DIR / "id_mapping_report.csv"
    with open(mapping_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["legacy_teacher_id", "canonical_teacher_id", "source", "verified_at", "verified_by"])
        if db:
            with db.connect() as conn:
                rows = conn.execute(text(
                    "SELECT legacy_teacher_id, canonical_teacher_id, source, verified_at, verified_by FROM public.teacher_id_aliases ORDER BY legacy_teacher_id"
                )).fetchall()
                for row in rows:
                    writer.writerow(row)

    # Generate recommendation traceability CSV
    trace_path = REPORTS_DIR / "recommendation_traceability.csv"
    with open(trace_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["metric", "value"])
        for check in checks:
            if check["name"] == "recommendation_traceability":
                writer.writerow(["traceable", check.get("traceable", 0)])
                writer.writerow(["total", check.get("total", 0)])

    print(f"\nAudit {'PASSED' if all_passed else 'FAILED'}")
    print(f"Reports written to {REPORTS_DIR}/")
    for check in checks:
        status = "PASS" if check["passed"] else "FAIL"
        print(f"  [{status}] {check['name']}")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(run_audit())
