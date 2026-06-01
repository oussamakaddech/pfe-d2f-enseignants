# Procédure de Rollback — Modèles ML (Predictive Analytics)

## Modèle géré
- **Fichier :** `esprit_D2F-predictive-analytics/data/models/gap_predictor.joblib`
- **Métadonnées :** `esprit_D2F-predictive-analytics/data/models/training_metadata.json`
- **Intégrité :** SHA-256 vérifié via `artifact_integrity.py` (HMAC sidecar)

## Procédure de rollback

### 1. Identification de la version précédente

Le CD stocke l'image Docker précédente via `.prev_image_tag` :

```bash
# Sur le serveur de déploiement (SSH)
cat /opt/d2f/.prev_image_tag
# Exemple : sha-a1b2c3d
```

### 2. Rollback du modèle uniquement (sans redéploiement complet)

```bash
# Restaurer depuis le backup automatique
cp /opt/d2f/data/models/gap_predictor.joblib.bak \
   /opt/d2f/data/models/gap_predictor.joblib

# Vérifier l'intégrité
python -c "
from app.ml.artifact_integrity import verify_artifact
ok = verify_artifact(
    '/opt/d2f/data/models/gap_predictor.joblib',
    '/opt/d2f/data/models/gap_predictor.joblib.sha256'
)
print('OK' if ok else 'ECHEC')
"

# Redémarrer le service
docker compose restart predictive-analytics-service
```

### 3. Rollback complet (modèle + API)

```bash
# Déployer l'image précédente
docker compose -f docker-compose.yml \
               -f docker-compose.prod.yml \
               up -d predictive-analytics-service
```

### 4. Validation post-rollback

```bash
# Vérifier le healthcheck
curl -sf http://localhost:8000/api/v1/analytics/health

# Vérifier que le modèle chargé correspond à l'attendu
curl -sf http://localhost:8000/api/predict/drift

# Lancer un test de gap prediction
curl -sf -X POST http://localhost:8000/api/v1/analytics/analyze/{enseignant_id}
```

## Prévention

1. **Tout entraînement** produit un artifact signé (SHA-256 + metadata.json)
2. **Le CI** tagge l'image Docker avec le SHA du commit
3. **Le CD** conserve l'image précédente (`latest` précédent)
4. **Un backup automatique** du modèle est fait avant chaque nouvel entraînement
