"""Vérifie le statut de serving de l'API."""
from unittest.mock import MagicMock

from app.core.config import Settings
from app.infrastructure.ml.predictor import ArtifactModelPort

settings = Settings()
port = ArtifactModelPort(settings, MagicMock())
status = port.status()

print("=== API SERVING STATUS ===")
print(f"  model_mode: {status['model_mode']}")
print(f"  model_version: {status['model_version']}")
print(f"  prediction_horizon: {status['prediction_horizon']}")
print(f"  fallback_reason: {status['fallback_reason']}")
print(f"  provenance: {status['provenance']}")
print(f"  artifact_name: {status['artifact_name']}")
print(f"  available: {status['available']}")
print(f"  registry_entry: {status['registry_entry']}")