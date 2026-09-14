from app.domain.entities.alert import Alert

SEVERITY_SCORE = {
    "INFO": 1,
    "FAIBLE": 1,
    "WARNING": 2,
    "MOYENNE": 2,
    "HAUTE": 3,
    "CRITIQUE": 4,
    "CRITICAL": 4,
}

REACH_SCORE = {
    "INDIVIDUEL": 1,
    "ENSEIGNANT": 1,
    "DEPARTEMENT": 4,
    "UP": 3,
    "COLLECTIF": 12,
    "GLOBAL": 8,
}


# Calcule le score de priorité d'une alerte : sévérité × portée.
# Exemple : une alerte CRITIQUE (4) touchant un COLLECTIF (12) → priorité 48.
def priority_score(alert: Alert) -> float:
    severity = SEVERITY_SCORE.get(alert.severity.upper(), 1)
    reach = REACH_SCORE.get(alert.target_type.upper(), 1)
    return float(severity * reach)


# Trie les alertes de la plus prioritaire à la moins prioritaire
# (utilisé pour l'affichage des alertes dans le dashboard).
def sort_by_priority(alerts: list[Alert]) -> list[Alert]:
    return sorted(alerts, key=priority_score, reverse=True)
