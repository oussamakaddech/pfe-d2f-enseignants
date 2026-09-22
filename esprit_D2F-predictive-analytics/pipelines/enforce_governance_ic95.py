"""Application de la regle IC95 au registre de modeles (gouvernance).

Contexte — audit d'autorite du 2026-09-22 (§2.6) :

- le projet s'est dote d'une regle explicite : **aucune promotion sur un
  avantage numerique non significatif** (IC95 de la difference de RMSE vs la
  reference incluant 0) ;
- cette regle a ete appliquee a la main, donc contournable : `v1.2.0` (XGBoost)
  a ete refuse alors que `v1.2.0-gb` (Gradient Boosting), dont le gain n'est pas
  significatif non plus (`reports/gb_production_decision.json` :
  `"significant": false`, IC95 [-0.1243, +0.1087]), a ete promu ACTIVE par
  `override_decision` ;
- l'entree `risk_predictor risk-simulation-v1.0.0` porte
  `approval_status = APPROVED` alors que ses propres notes declarent
  `decision=reject` : un simple passage en `status = ACTIVE` suffirait a la
  servir sans nouveau controle (`_registry_rejection_reason` ne teste que
  `approval_status == APPROVED`).

Ce script rend la regle AUTOMATIQUE et remet le registre en accord avec ses
propres mesures :

1. il enregistre le resultat du test de significativite (`lift_significant_95`,
   `lift_rmse_ci95`) des versions dont la mesure est documentee ;
2. toute entree ACTIVE dont le gain n'est pas significatif est **retrogradee**
   en CANDIDATE / PENDING (aucun modele n'est alors promu : le service sert le
   moteur heuristique explicable, cf. `ML_SERVING_MODE=HEURISTIC`) — SAUF si
   l'entree porte un override de gouvernance declare (acteur + date +
   justification, decision projet du 2026-09-22) : le maintien ACTIVE est alors
   journalise, la mesure restant enregistree honnetement ;
3. toute entree dont les notes declarent `decision=reject` passe en
   `approval_status = REJECTED`.

Usage :
    python -m pipelines.enforce_governance_ic95            # applique
    python -m pipelines.enforce_governance_ic95 --dry-run  # montre sans ecrire
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).parent.parent
REGISTRY_PATH = BASE_DIR / "data" / "models" / "model_registry.json"
DECISION_PATH = BASE_DIR / "reports" / "gb_production_decision.json"

# Resultats de significativite MESURES (source citee, jamais inventee).
# - v1.2.0-gb : reports/gb_production_decision.json (delta RMSE IC95 vs MLP v1.1.0).
# - v1.2.0    : notes de l'entree de registre (IC95 [-0.0957, +0.1872], refus trace).
# - simulation-v1.1.0 / simulation-v1.0.0 : challengers, jamais promus.
MEASURED_SIGNIFICANCE: dict[str, dict[str, Any]] = {
    "v1.2.0-gb": {"lift_significant_95": False, "lift_rmse_ci95": [-0.1243, 0.1087]},
    "v1.2.0": {"lift_significant_95": False, "lift_rmse_ci95": [-0.0957, 0.1872]},
}

DEMOTION_NOTE = (
    "RETROGRADE le 2026-09-22 (audit d'autorite §2.6) : le gain du modele n'est pas "
    "statistiquement significatif sur le corpus de production (IC95 de la difference de "
    "RMSE incluant 0). La regle « aucune promotion sur un avantage non significatif », "
    "appliquee a v1.2.0, est desormais AUTOMATIQUE (model_registry."
    "significance_promotion_error) : cette version ne peut plus etre promue sans nouvelle "
    "mesure significative. Le service sert le moteur heuristique explicable "
    "(ML_SERVING_MODE=HEURISTIC)."
)


def _load() -> list[dict[str, Any]]:
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def apply_governance(entries: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    """Applique les 3 regles et retourne (entrees, journal des actions)."""
    actions: list[str] = []
    now = datetime.now(timezone.utc).isoformat()
    for entry in entries:
        version = str(entry.get("model_version"))
        measured = MEASURED_SIGNIFICANCE.get(version)
        if measured:
            if entry.get("lift_significant_95") != measured["lift_significant_95"]:
                entry["lift_significant_95"] = measured["lift_significant_95"]
                entry["lift_rmse_ci95"] = measured["lift_rmse_ci95"]
                actions.append(f"{version}: significativite enregistree ({measured})")
        if entry.get("lift_significant_95") is False and entry.get("status") == "ACTIVE":
            # Exception de gouvernance TRACEE (decision projet 2026-09-22) : un
            # override declare (acteur + date + justification) est RESPECTE —
            # l'entree reste ACTIVE et l'action est journalisee, jamais silencieuse.
            if entry.get("override_decision") is True:
                actions.append(
                    f"{version}: maintien ACTIVE — override declare par "
                    f"{entry.get('override_actor')} le {str(entry.get('override_date'))[:10]} "
                    f"(gain non significatif assume : {entry.get('lift_rmse_ci95')})"
                )
            else:
                entry["status"] = "CANDIDATE"
                entry["approval_status"] = "PENDING"
                entry["notes"] = (str(entry.get("notes") or "") + " | " + DEMOTION_NOTE).strip(" |")
                actions.append(f"{version}: ACTIVE -> CANDIDATE/PENDING (gain non significatif)")
        if entry.get("approval_status") == "APPROVED" and "decision=reject" in str(entry.get("notes") or ""):
            entry["approval_status"] = "REJECTED"
            entry["notes"] = (
                str(entry.get("notes") or "") + " | approval_status corrige en REJECTED le " + now[:10]
                + " : l'entree declare elle-meme decision=reject (audit §2.6) — un statut APPROVED "
                "aurait permis un passage en ACTIVE sans nouveau controle."
            )
            actions.append(f"{version}: approval_status APPROVED -> REJECTED (decision=reject auto-declaree)")
    return entries, actions


def main() -> int:
    parser = argparse.ArgumentParser(description="Applique la regle IC95 au registre de modeles")
    parser.add_argument("--dry-run", action="store_true", help="Affiche les actions sans ecrire")
    args = parser.parse_args()

    entries = _load()
    updated, actions = apply_governance(entries)

    print(f"[registre] {REGISTRY_PATH}")
    if not actions:
        print("  conforme : aucune action (regle IC95 deja appliquee)")
        return 0
    for action in actions:
        print(f"  - {action}")
    if args.dry_run:
        print("  (dry-run : fichier non modifie)")
        return 0
    REGISTRY_PATH.write_text(json.dumps(updated, indent=2, ensure_ascii=False), encoding="utf-8")
    active = [e.get("model_version") for e in updated if e.get("status") == "ACTIVE"]
    print(f"  ecrit. Entrees ACTIVE : {active or 'aucune (service en moteur heuristique)'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
