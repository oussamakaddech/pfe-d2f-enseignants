from datetime import datetime, timezone


def iso_utc(value: datetime) -> str:
    """ISO 8601 en UTC, sans doublon de fuseau.

    `isoformat() + "Z"` n'est correct que pour une date naïve : une date lue en
    base (avec fuseau) donnait `...+00:00Z`, refusé par la validation des
    réponses (GET /needs en 500).
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).isoformat()
    return value.astimezone(timezone.utc).isoformat()
