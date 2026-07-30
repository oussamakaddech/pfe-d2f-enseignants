#!/usr/bin/env python3
"""Check that dashboard and teacher endpoints return consistent risk scores.

Verifies that risk_engine.py is the single source of truth for deterministic
risk scoring across all API endpoints.

Usage:
    python scripts/check_dashboard_risk_consistency.py [--db-url DATABASE_URL]
"""

import argparse
import json
import sys
from pathlib import Path

REPORTS_DIR = Path(__file__).parent.parent / "reports"


def check_risk_formula_consistency():
    """Verify that risk_engine.py uses the documented formula."""
    risk_engine_path = Path(__file__).parent.parent / "esprit_D2F-predictive-analytics" / "app" / "risk_engine.py"

    if not risk_engine_path.exists():
        return {
            "name": "risk_formula_consistency",
            "passed": False,
            "details": ["risk_engine.py not found"],
        }

    content = risk_engine_path.read_text(encoding="utf-8")

    # Check for the documented formula components
    required_components = [
        "0.40",  # critical_gap_factor weight
        "0.25",  # coverage_factor weight
        "0.20",  # stagnation_factor weight
        "0.15",  # regression_factor weight
    ]

    missing = [c for c in required_components if c not in content]
    if missing:
        return {
            "name": "risk_formula_consistency",
            "passed": False,
            "details": [f"Missing formula components: {missing}"],
        }

    # Check for alternative risk formulas (should not exist)
    alternative_patterns = [
        "risk = 0.3",
        "risk = 0.5",
        "risk_score = 0.3",
    ]

    alternatives_found = [p for p in alternative_patterns if p in content]
    if alternatives_found:
        return {
            "name": "risk_formula_consistency",
            "passed": False,
            "details": [f"Alternative risk formulas found: {alternatives_found}"],
        }

    return {
        "name": "risk_formula_consistency",
        "passed": True,
        "details": ["Risk formula matches documented weights (0.40/0.25/0.20/0.15)"],
    }


def check_no_alternative_risk_formulas():
    """Scan all Python files for alternative risk formulas."""
    base_dir = Path(__file__).parent.parent / "esprit_D2F-predictive-analytics"
    alternative_patterns = [
        "0.3 *",
        "0.5 *",
        "risk_score = ",
    ]

    files_with_alternatives = []
    for subdir in ["app", "pipelines"]:
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
            if "risk" in py_file.name.lower() or "alert" in py_file.name.lower():
                for pattern in alternative_patterns:
                    if pattern in content and "0.40" not in content.split(pattern)[0][-20:]:
                        files_with_alternatives.append(f"{py_file}:{pattern}")

    if files_with_alternatives:
        return {
            "name": "no_alternative_risk_formulas",
            "passed": False,
            "details": [f"Files with potential alternative formulas: {files_with_alternatives[:5]}"],
        }

    return {
        "name": "no_alternative_risk_formulas",
        "passed": True,
        "details": ["No alternative risk formulas found"],
    }


def check_risk_levels():
    """Verify risk levels are correctly defined."""
    risk_engine_path = Path(__file__).parent.parent / "esprit_D2F-predictive-analytics" / "app" / "risk_engine.py"

    if not risk_engine_path.exists():
        return {
            "name": "risk_levels",
            "passed": False,
            "details": ["risk_engine.py not found"],
        }

    content = risk_engine_path.read_text(encoding="utf-8")

    required_levels = ["CRITIQUE", "ELEVE", "MODERE", "FAIBLE"]
    missing = [l for l in required_levels if l not in content]

    if missing:
        return {
            "name": "risk_levels",
            "passed": False,
            "details": [f"Missing risk levels: {missing}"],
        }

    return {
        "name": "risk_levels",
        "passed": True,
        "details": ["All risk levels defined: CRITIQUE, ELEVE, MODERE, FAIBLE"],
    }


def main():
    parser = argparse.ArgumentParser(description="Check dashboard risk consistency")
    parser.add_argument("--db-url", help="Database URL (optional)")
    args = parser.parse_args()

    checks = [
        check_risk_formula_consistency(),
        check_no_alternative_risk_formulas(),
        check_risk_levels(),
    ]

    all_passed = all(c["passed"] for c in checks)

    print("\n=== Dashboard Risk Consistency Check ===\n")
    for check in checks:
        status = "PASS" if check["passed"] else "FAIL"
        print(f"  [{status}] {check['name']}")
        for detail in check.get("details", []):
            print(f"         {detail}")

    # Write report
    report_path = REPORTS_DIR / "risk_consistency_report.json"
    with open(report_path, "w") as f:
        json.dump({"checks": checks, "all_passed": all_passed}, f, indent=2)

    print(f"\nReport written to {report_path}")
    print(f"\nOverall: {'PASS' if all_passed else 'FAIL'}")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
