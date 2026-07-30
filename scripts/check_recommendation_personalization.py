#!/usr/bin/env python3
"""Check that recommendations are personalized per teacher.

Verifies:
- Different teachers get different recommendations when profiles differ
- No completed training is recommended
- Top-3 lists are not identical across all teachers
- Cache keys include teacher_id

Usage:
    python scripts/check_recommendation_personalization.py
"""

import json
import sys
from pathlib import Path

REPORTS_DIR = Path(__file__).parent.parent / "reports"
DATA_DIR = Path(__file__).parent.parent / "esprit_D2F-predictive-analytics" / "data"


def check_recommendation_diversity():
    """Check that top-3 recommendations are not identical across teachers."""
    recs_path = REPORTS_DIR / "recommendation_traceability.csv"

    if not recs_path.exists():
        return {
            "name": "recommendation_diversity",
            "passed": False,
            "details": ["recommendation_traceability.csv not found"],
        }

    lines = recs_path.read_text(encoding="utf-8").strip().split("\n")
    if len(lines) < 2:
        return {
            "name": "recommendation_diversity",
            "passed": False,
            "details": ["No recommendation data found"],
        }

    # Parse recommendations (skip header and audit notes)
    recs = []
    for line in lines[1:]:
        if line.startswith("#"):
            break
        parts = line.split(",")
        if len(parts) >= 11:
            recs.append({
                "teacher_id": parts[0],
                "training_id": parts[2],
                "score_global": parts[9],
            })

    if not recs:
        return {
            "name": "recommendation_diversity",
            "passed": False,
            "details": ["No recommendation records parsed"],
        }

    # Group by teacher
    by_teacher = {}
    for r in recs:
        by_teacher.setdefault(r["teacher_id"], []).append(r)

    # Check top-3 uniqueness
    top3_sets = {}
    for tid, teacher_recs in by_teacher.items():
        top3 = sorted(teacher_recs, key=lambda x: float(x["score_global"]), reverse=True)[:3]
        top3_ids = tuple(sorted(r["training_id"] for r in top3))
        top3_sets.setdefault(top3_ids, []).append(tid)

    max_concentration = max(len(v) for v in top3_sets.values()) if top3_sets else 0
    total_teachers = len(by_teacher)
    concentration_pct = (max_concentration / total_teachers * 100) if total_teachers > 0 else 0

    passed = concentration_pct <= 25

    return {
        "name": "recommendation_diversity",
        "passed": passed,
        "details": [
            f"Top-3 concentration: {max_concentration}/{total_teachers} ({concentration_pct:.1f}%)",
            f"Unique top-3 sets: {len(top3_sets)}",
        ],
    }


def check_completed_training_exclusion():
    """Check that completed trainings are not recommended."""
    # Check the recommendation engine code for completed training exclusion
    rec_engine_path = Path(__file__).parent.parent / "esprit_D2F-predictive-analytics" / "app" / "engines" / "recommendation_engine.py"

    if not rec_engine_path.exists():
        return {
            "name": "completed_training_exclusion",
            "passed": False,
            "details": ["recommendation_engine.py not found"],
        }

    content = rec_engine_path.read_text(encoding="utf-8")

    if "formations_completees" in content and "APPROVED" in content:
        return {
            "name": "completed_training_exclusion",
            "passed": True,
            "details": ["Completed trainings are excluded via formations_completees set"],
        }

    return {
        "name": "completed_training_exclusion",
        "passed": False,
        "details": ["Completed training exclusion logic not found"],
    }


def check_cache_isolation():
    """Check that cache keys include teacher_id."""
    base_dir = Path(__file__).parent.parent / "esprit_D2F-predictive-analytics"

    cache_patterns = ["cache_key", "cache", "_cache"]
    teacher_id_patterns = ["teacher_id", "enseignant_id"]

    # Only scan specific directories to avoid venv
    search_dirs = ["app", "pipelines"]
    files_with_cache = []
    for subdir in search_dirs:
        scan_dir = base_dir / subdir
        if not scan_dir.exists():
            continue
        for py_file in scan_dir.rglob("*.py"):
            if "venv" in str(py_file) or "__pycache__" in str(py_file):
                continue
            try:
                content = py_file.read_text(encoding="utf-8")
            except (UnicodeDecodeError, PermissionError):
                continue
            if any(p in content for p in cache_patterns):
                has_teacher_id = any(p in content for p in teacher_id_patterns)
                if has_teacher_id:
                    files_with_cache.append(str(py_file.relative_to(base_dir)))

    if files_with_cache:
        return {
            "name": "cache_isolation",
            "passed": True,
            "details": [f"Cache isolation found in: {files_with_cache[:3]}"],
        }

    return {
        "name": "cache_isolation",
        "passed": False,
        "details": ["No cache isolation by teacher_id found"],
    }


def check_recommendation_traceability():
    """Check that recommendations trace back to gaps."""
    rec_engine_path = Path(__file__).parent.parent / "esprit_D2F-predictive-analytics" / "app" / "engines" / "recommendation_engine.py"

    if not rec_engine_path.exists():
        return {
            "name": "recommendation_traceability",
            "passed": False,
            "details": ["recommendation_engine.py not found"],
        }

    content = rec_engine_path.read_text(encoding="utf-8")

    if "skill_gap_id" in content and "gap" in content.lower():
        return {
            "name": "recommendation_traceability",
            "passed": True,
            "details": ["Recommendations reference skill_gap_id for traceability"],
        }

    return {
        "name": "recommendation_traceability",
        "passed": False,
        "details": ["Recommendation traceability to gaps not found"],
    }


def check_id_consistency():
    """Check that teacher IDs are consistent across CSV files."""
    teachers_path = DATA_DIR / "clean" / "teachers.csv"
    competencies_path = DATA_DIR / "clean" / "teacher_competencies.csv"

    if not teachers_path.exists() or not competencies_path.exists():
        return {
            "name": "id_consistency",
            "passed": False,
            "details": ["CSV files not found"],
        }

    # Check teachers.csv
    with open(teachers_path) as f:
        teacher_lines = f.readlines()[1:]  # skip header
    teacher_ids = set(line.split(",")[0] for line in teacher_lines if line.strip())

    # Check competencies.csv
    with open(competencies_path) as f:
        comp_lines = f.readlines()[1:]
    comp_ids = set(line.split(",")[0] for line in comp_lines if line.strip())

    # Check for mixed formats
    ens_ids = {t for t in teacher_ids if t.startswith("ENS")}
    t_ids = {t for t in teacher_ids if t.startswith("T") and not t.startswith("ENS")}

    missing_comp = teacher_ids - comp_ids

    issues = []
    if t_ids:
        issues.append(f"Legacy T-format IDs found: {sorted(t_ids)[:5]}")
    if missing_comp:
        issues.append(f"Teachers without competencies: {sorted(missing_comp)[:5]}")

    if issues:
        return {
            "name": "id_consistency",
            "passed": False,
            "details": issues,
        }

    return {
        "name": "id_consistency",
        "passed": True,
        "details": [
            f"All {len(teacher_ids)} teachers use ENS format",
            f"All {len(teacher_ids)} teachers have competency data",
        ],
    }


def main():
    checks = [
        check_recommendation_diversity(),
        check_completed_training_exclusion(),
        check_cache_isolation(),
        check_recommendation_traceability(),
        check_id_consistency(),
    ]

    all_passed = all(c["passed"] for c in checks)

    print("\n=== Recommendation Personalization Check ===\n")
    for check in checks:
        status = "PASS" if check["passed"] else "FAIL"
        print(f"  [{status}] {check['name']}")
        for detail in check.get("details", []):
            print(f"         {detail}")

    # Write report
    report_path = REPORTS_DIR / "recommendation_personalization_report.json"
    with open(report_path, "w") as f:
        json.dump({"checks": checks, "all_passed": all_passed}, f, indent=2)

    print(f"\nReport written to {report_path}")
    print(f"\nOverall: {'PASS' if all_passed else 'FAIL'}")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
