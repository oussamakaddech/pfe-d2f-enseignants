"""Verification de coherence cross-endpoints du dashboard D2F master.

Verifie que :
  - GET /api/v1/d2f/kpis.score_risque_moyen == mean(GET /api/v1/d2f/teachers[*].risk_score)
  - GET /api/v1/d2f/kpis.enseignants_a_risque == count(GET /api/v1/d2f/at-risk)
  - GET /api/v1/d2f/kpis.enseignants_critiques == count(GET /api/v1/d2f/critical)
  - GET /api/v1/d2f/kpis.total_teachers == count(GET /api/v1/d2f/teachers)

Usage :
  python -m pipelines.verify_dashboard_consistency [--base-url http://localhost:8000]
"""

import argparse
import json
import sys
from typing import Any
from urllib import request as urlrequest
from urllib.error import URLError


def fetch_json(base_url: str, path: str, timeout: int = 10) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}{path}"
    with urlrequest.urlopen(url, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def verify(base_url: str) -> dict[str, Any]:
    """Execute toutes les verifications de coherence cross-endpoints."""
    report: dict[str, Any] = {
        "ok": True,
        "checks": [],
        "base_url": base_url,
    }

    def _add(name: str, ok: bool, detail: str, severity: str = "error") -> None:
        report["checks"].append({
            "name": name,
            "ok": ok,
            "detail": detail,
            "severity": severity,
        })
        if not ok and severity == "error":
            report["ok"] = False

    # Recuperer les donnees des endpoints D2F master
    try:
        kpis = fetch_json(base_url, "/api/v1/d2f/kpis")
        teachers = fetch_json(base_url, "/api/v1/d2f/teachers")
        at_risk = fetch_json(base_url, "/api/v1/d2f/at-risk")
        critical = fetch_json(base_url, "/api/v1/d2f/critical")
    except URLError as e:
        _add("connectivity", False, f"Impossible d'atteindre {base_url}: {e}", "error")
        return report

    teacher_list = teachers.get("teachers", [])
    teacher_risks = [
        t["risk_score"] for t in teacher_list
        if isinstance(t.get("risk_score"), (int, float))
    ]

    # Check 1 : kpis.total_teachers == len(teachers)
    n_teachers_api = kpis.get("total_teachers")
    n_teachers_list = len(teacher_list)
    _add(
        "total_teachers_consistent",
        n_teachers_api == n_teachers_list,
        f"kpis.total_teachers={n_teachers_api} vs len(teachers)={n_teachers_list}",
    )

    # Check 2 : kpis.score_risque_moyen == mean(risk_score)
    if teacher_risks:
        mean_risk = round(sum(teacher_risks) / len(teacher_risks), 4)
        kpis_mean = kpis.get("score_risque_moyen")
        # Tolerance 1e-3 pour arrondis flottants
        diff = abs(mean_risk - kpis_mean) if kpis_mean is not None else float("inf")
        _add(
            "score_risque_moyen_consistent",
            diff < 1e-3,
            f"kpis.score_risque_moyen={kpis_mean} vs mean(teachers.risk_score)={mean_risk} (diff={diff:.4f})",
        )

    # Check 3 : kpis.enseignants_a_risque == count(teachers.risk_score >= 0.5)
    n_at_risk_api = kpis.get("enseignants_a_risque")
    n_at_risk_list = sum(1 for r in teacher_risks if r >= 0.5)
    _add(
        "enseignants_a_risque_consistent",
        n_at_risk_api == n_at_risk_list,
        f"kpis.enseignants_a_risque={n_at_risk_api} vs count(risk>=0.5)={n_at_risk_list}",
    )

    # Check 4 : kpis.enseignants_critiques == count(teachers.risk_score >= 0.75)
    n_critical_api = kpis.get("enseignants_critiques")
    n_critical_list = sum(1 for r in teacher_risks if r >= 0.75)
    _add(
        "enseignants_critiques_consistent",
        n_critical_api == n_critical_list,
        f"kpis.enseignants_critiques={n_critical_api} vs count(risk>=0.75)={n_critical_list}",
    )

    # Check 5 : len(at-risk.teachers) == kpis.enseignants_a_risque
    n_at_risk_endpoint = at_risk.get("total_at_risk")
    _add(
        "at_risk_endpoint_consistent",
        n_at_risk_endpoint == n_at_risk_api,
        f"at-risk.total_at_risk={n_at_risk_endpoint} vs kpis.enseignants_a_risque={n_at_risk_api}",
    )

    # Check 6 : len(critical.teachers) == kpis.enseignants_critiques
    n_critical_endpoint = critical.get("total_critical")
    _add(
        "critical_endpoint_consistent",
        n_critical_endpoint == n_critical_api,
        f"critical.total_critical={n_critical_endpoint} vs kpis.enseignants_critiques={n_critical_api}",
    )

    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Verifie la coherence cross-endpoints D2F")
    parser.add_argument(
        "--base-url", default="http://localhost:8000",
        help="URL de base du service FastAPI",
    )
    args = parser.parse_args()

    report = verify(args.base_url)
    print("=" * 70)
    print(f"COHERENCE DASHBOARD D2F — {args.base_url}")
    print("=" * 70)
    for c in report["checks"]:
        mark = "[OK]" if c["ok"] else "[KO]"
        print(f"  {mark} {c['name']} ({c['severity']}): {c['detail']}")
    print("=" * 70)
    print("VERDICT: " + ("PASS" if report["ok"] else "FAIL"))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
