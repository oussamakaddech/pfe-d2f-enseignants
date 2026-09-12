"""Modes d'exécution du service ML — définition unique des constantes.

Les trois modes sont strictement exclusifs :

- ``PRODUCTION_ML`` : toutes les validations passent (intégrité, provenance,
  features compatibles, métriques exigées, registre actif approuvé).
- ``DEMO_ML`` : le corpus contient des données synthétiques ou est
  insuffisant — utilisable pour démonstration, jamais présenté comme production.
- ``HEURISTIC_FALLBACK`` : échec d'intégrité, de provenance, de schéma ou
  de disponibilité — moteur heuristique explicable toujours disponible.
"""
from __future__ import annotations

PRODUCTION_ML = "PRODUCTION_ML"
DEMO_ML = "DEMO_ML"
HEURISTIC_FALLBACK = "HEURISTIC_FALLBACK"

# Modes reconnus — toute autre valeur est considérée invalide.
RECOGNIZED_MODES = {PRODUCTION_ML, DEMO_ML, HEURISTIC_FALLBACK}


def get_mode_label(mode: str) -> str:
    """Retourne un libellé humain pour un mode reconnu (sinon le mode brute)."""
    return {
        PRODUCTION_ML: "modèle actif en production",
        DEMO_ML: "modèle de démonstration (non productif)",
        HEURISTIC_FALLBACK: "moteur heuristique explicitable",
    }.get(mode, mode)