# D2F Predictive Analytics — commandes de gouvernance ML
# Usage : make <cible> (depuis espritD2F-predictive-analytics/)

.PHONY: corpus-refresh calibration-study validate

# Limite 7.6.2 : régénère le corpus depuis les snapshots mensuels
# (analyse.niveau_snapshot) — cibles réelles uniquement, sans extrapolation.
corpus-refresh:
	python -m scripts.corpus_refresh

# Limite 7.6.3 : étude de calibration de l'indice de risque
# (refuse de s'exécuter sans événements observés réels).
calibration-study:
	python -m pipelines.calibration_study

# Validation statistique multi-fenêtres + IC bootstrap
# (refusée explicitement sous 500 lignes).
validate:
	python -m pipelines.validate_all_models
