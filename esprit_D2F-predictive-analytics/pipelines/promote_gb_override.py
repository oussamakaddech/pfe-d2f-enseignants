"""Promotion ACTIVE de GB v1.2.0-gb sous override de gouvernance TRACE (2026-09-22).

Contexte : le gain du GB sur le holdout servi n'est pas statistiquement
significatif (IC95 [-0.1243, +0.1087] vs MLP v1.1.0) — la règle §2.6 refusait
donc sa promotion. Décision projet explicite : servir le meilleur modèle
disponible (GB) et ÉCARTER la règle pour cette version, de façon TRACÉE et
RÉVERSIBLE :

- l'artefact servi est RÉUTILISÉ tel quel (aucun réentraînement) : son empreinte
  SHA-256 est vérifiée contre celle du registre avant toute action ;
- l'override est déclaré via ``ModelRegistry.declare_override`` (acteur, date,
  justification) et reste visible dans l'entrée de registre ;
- la mesure honnête est conservée (``lift_significant_95=false`` + IC95) ;
- ``enforce_governance_ic95`` respecte désormais l'override (maintien journalisé) ;
- rollback disponible : artefact ``gap_predictor_temporal_v111.joblib`` (v1.1.0).

Usage :
    python -m pipelines.promote_gb_override --dry-run   # vérifie sans écrire
    python -m pipelines.promote_gb_override             # déclare + promeut (ACTIVE)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).parent.parent
MODELS_DIR = BASE / "data" / "models"
REPORTS_DIR = BASE / "reports"
sys.path.insert(0, str(BASE))

from app.infrastructure.ml.model_registry import ModelRegistry  # noqa: E402

GB_VERSION = "v1.2.0-gb"
ARTIFACT = MODELS_DIR / "gap_predictor_temporal.joblib"
ROLLBACK_ARTIFACT = MODELS_DIR / "gap_predictor_temporal_v111.joblib"
REPORT_PATH = REPORTS_DIR / "gb_override_promotion.json"
ACTOR = "decision-projet:2026-09-22"
JUSTIFICATION = (
    "Decision projet : servir le meilleur modele disponible malgre un gain non "
    "significatif sur le holdout servi (GB 1.2140 vs MLP 1.2319, IC95 [-0.1243, +0.1087]) "
    "— GB meilleur en point sur les deux regimes (reel 1.2140 ; sim1500 0.6246), meilleur "
    "accuracy +/-1.0 sur 4/6 corpus du projet. Exception TRACEE et REVERSIBLE "
    "(rollback gap_predictor_temporal_v111.joblib)."
)


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Promotion GB v1.2.0-gb sous override trace")
    parser.add_argument("--dry-run", action="store_true", help="Verifie sans ecrire (registre intact)")
    args = parser.parse_args()

    registry = ModelRegistry(MODELS_DIR / "model_registry.json", MODELS_DIR)
    entry = registry.get(GB_VERSION)
    if entry is None:
        print(f"[REFUS] {GB_VERSION} absente du registre")
        return 1

    disk_sha = _sha256_file(ARTIFACT)
    print(f"[integrite] registre={entry.artifact_sha256[:16]}... disque={disk_sha[:16]}...")
    if disk_sha != entry.artifact_sha256:
        print("[REFUS] empreinte de l'artefact differente du registre : aucune promotion")
        return 1
    print(f"[mesure honnete] lift_significant_95={entry.lift_significant_95} "
          f"IC95={entry.lift_rmse_ci95} (conservee telle quelle)")

    if args.dry_run:
        print(f"  (dry-run : override + promotion NON ecrits — statut actuel "
              f"{entry.status}/{entry.approval_status})")
        return 0

    declared = registry.declare_override(GB_VERSION, ACTOR, JUSTIFICATION)
    if declared is None:
        print("[REFUS] declaration d'override impossible")
        return 1
    promoted = registry.approve(GB_VERSION, actor=ACTOR)
    if promoted is None:
        print("[REFUS] promotion refusee malgre l'override declare")
        return 1
    print(f"[registre] {GB_VERSION} -> {promoted.status}/{promoted.approval_status} "
          f"(override declare par {ACTOR})")
    active = registry.active()
    print(f"[registre] ACTIVE = {active.model_version if active else None}")

    report = {
        "decision": "PROMOTE_ACTIVE_UNDER_DECLARED_OVERRIDE",
        "decided_at": datetime.now(timezone.utc).isoformat(),
        "actor": ACTOR,
        "justification": JUSTIFICATION,
        "honest_measurement_kept": {
            "lift_significant_95": entry.lift_significant_95,
            "lift_rmse_ci95": entry.lift_rmse_ci95,
            "note": "la mesure non significative reste enregistree ; la regle §2.6 est "
                    "explicitement ecartee pour cette version (override), pas supprimee",
        },
        "artifact": str(ARTIFACT.relative_to(BASE)),
        "artifact_sha256": disk_sha,
        "rollback": {
            "previous_model": "v1.1.0 (MLP) — ARCHIVED, artefact gap_predictor_temporal_v111.joblib",
            "undo_override": "remettre override_decision=false et status=CANDIDATE "
                             "(ou re-executer pipelines/enforce_governance_ic95.py apres retrait de l'override)",
        },
        "serving_required": {
            "env": "ML_SERVING_MODE=PRODUCTION_ML (service + compose)",
            "verify": "GET /api/v1/analytics/model-health -> PRODUCTION_ML v1.2.0-gb, fallback_reason=null",
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] rapport : {REPORT_PATH.relative_to(BASE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
