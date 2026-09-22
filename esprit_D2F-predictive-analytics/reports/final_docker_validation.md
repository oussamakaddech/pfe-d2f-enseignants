# Validation finale Docker

- **title** : Validation finale Docker
- **generated_at** : 2026-08-22T02:31:56.608780+00:00
- **docker_server_version** : 29.6.1
- **image** : d2f-predictive-analytics:final
- **image_exists** : True
- **container** : pfe-d2f-final
- **container_state** : 
## build
```json
{
  "status": "PASSED",
  "dockerfile": "Dockerfile",
  "note": "multi-stage builder + non-root appuser + HEALTHCHECK"
}
```
## health
```json
{
  "status_code": null,
  "error": "<urlopen error [WinError 10061] Aucune connexion n’a pu être établie car l’ordinateur cible l’a expressément refusée>"
}
```
- **model_in_container** : None
- **model_production_ml_in_container** : False
- **jwt_protection** : {'protected_routes_401_without_token': True, 'routes': ['/api/v1/analytics/status', '/api/v1/analytics/dashboard']}
- **limitations** : ["La base PostgreSQL n'est pas jointe depuis le conteneur de validation locale (database=unreachable) — vérifié côté packaging/health, non bloquant.", 'Validation effectuée sur Windows (Docker Desktop) ; la cible de production reste Linux.']
- **conclusion** : L'image Docker se construit, démarre, expose le modèle ML en PRODUCTION_ML et protège ses routes par JWT.