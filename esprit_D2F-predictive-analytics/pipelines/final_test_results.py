"""Partie 4 — Exécute pytest tests/ -v et génère les rapports finaux.

Produits :
- reports/final_test_results.txt  : sortie verbose brute de pytest
- reports/final_test_results.json : résumé structuré (total, passed, failed,
  skipped, warnings, duration, collection_errors, liste détaillée)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = BASE_DIR / "reports"
PYTHON = str(Path(sys.executable))

VERBOSE_LOG = REPORTS_DIR / "final_test_results.txt"
JSON_OUT = REPORTS_DIR / "final_test_results.json"


def run_pytest() -> str:
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run(
        [PYTHON, "-m", "pytest", "tests/", "-vv", "--tb=short"],
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    return proc.stdout + proc.stderr


def parse_summary(output: str) -> dict:
    summary = {
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "errors": 0,
        "xfailed": 0,
        "xpassed": 0,
        "warnings": 0,
        "duration_seconds": None,
        "collection_errors": 0,
        "tests": [],
    }
    # Ligne finale : "N passed, M failed, K skipped, J warnings in T"
    final_line = [l for l in output.splitlines() if re.search(r"passed|failed", l) and " in " in l]
    if final_line:
        line = final_line[-1]
        m = re.search(r"(\d+)\s+passed", line)
        if m:
            summary["passed"] = int(m.group(1))
        m = re.search(r"(\d+)\s+failed", line)
        if m:
            summary["failed"] = int(m.group(1))
        m = re.search(r"(\d+)\s+skipped", line)
        if m:
            summary["skipped"] = int(m.group(1))
        m = re.search(r"(\d+)\s+warning", line)
        if m:
            summary["warnings"] = int(m.group(1))
        m = re.search(r"(\d+)\s+error", line)
        if m:
            summary["errors"] = int(m.group(1))
        m = re.search(r"in\s+([\d.]+)s", line)
        if m:
            summary["duration_seconds"] = float(m.group(1))
    for line in output.splitlines():
        if re.search(r"\bPASSED\b", line):
            summary["passed"] += 1
            summary["tests"].append({"name": line.split()[0], "status": "PASSED"})
        elif re.search(r"\bFAILED\b", line):
            summary["failed"] += 1
            summary["tests"].append({"name": line.split()[0], "status": "FAILED"})
        elif re.search(r"\bERROR\b", line):
            summary["errors"] += 1
            summary["tests"].append({"name": line.split()[0], "status": "ERROR"})
        elif re.search(r"\bSKIPPED\b", line):
            summary["skipped"] += 1
            summary["tests"].append({"name": line.split()[0], "status": "SKIPPED"})
        elif re.search(r"\bXFAIL\b", line):
            summary["xfailed"] += 1
            summary["tests"].append({"name": line.split()[0], "status": "XFAIL"})
        elif re.search(r"\bXPASS\b", line):
            summary["xpassed"] += 1
            summary["tests"].append({"name": line.split()[0], "status": "XPASS"})
        elif re.search(r"warning\b", line, re.IGNORECASE) and "Warning" in line:
            summary["warnings"] += 1
        elif "ERRORS" in line:
            summary["collection_errors"] += 1
    return summary


def main() -> int:
    REPORTS_DIR.mkdir(exist_ok=True)
    start = time.perf_counter()
    output = run_pytest()
    elapsed = time.perf_counter() - start
    VERBOSE_LOG.write_text(output, encoding="utf-8")

    summary = parse_summary(output)
    summary["wall_clock_seconds"] = round(elapsed, 2)
    summary["quality_gate_passed"] = summary["failed"] == 0 and summary["errors"] == 0

    failed_list = [t["name"] for t in summary["tests"] if t["status"] in ("FAILED", "ERROR")]
    summary["failed_list"] = failed_list

    JSON_OUT.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    print(
        f"passed={summary['passed']} failed={summary['failed']} errors={summary['errors']} "
        f"skipped={summary['skipped']} xfailed={summary['xfailed']} xpassed={summary['xpassed']} "
        f"warnings={summary['warnings']} duration={summary['duration_seconds']}s "
        f"wall_clock={summary['wall_clock_seconds']}s"
    )
    print(f"txt -> {VERBOSE_LOG}")
    print(f"json -> {JSON_OUT}")
    return 0 if summary["quality_gate_passed"] else 1


if __name__ == "__main__":
    sys.exit(main())