# Final Production Dataset Validation

- **title** : Validation finale du dataset de production
- **generated_at** : 2026-08-20T14:49:39.968751+00:00
## versions
- **v1.0.0** : {"exists": true, "path": "C:\\Users\\oussama\\Desktop\\pfe-d2f-enseignants\\esprit_D2F-predictive-analytics\\data\\clean\\training_corpus_provenanced.csv", "n_rows": 107, "n_teachers": 40, "n_competencies": 11, "date_min": "2016-03-01", "date_max": "2026-07-22", "dataset_version": "v1.0.0", "has_provenance": true, "missing_required_columns": [], "provenance_classes": {"INSTITUTIONAL_RECORD": 107, "DEMO_SEED": 0, "UNKNOWN": 0}, "synthetic_share_pct": 0.0, "real_share_pct": 100.0, "source_types": {"postgresql_d2f": 107}, "forbidden_in_X_present": [], "target_stats": {"count": 107.0, "mean": 2.433, "std": 1.2271, "min": 0.0, "25%": 1.3333, "50%": 2.3333, "75%": 3.3333, "max": 4.0}, "dataset_hash": "c70523c0d353ccfed62ca432c0a8486a4ec40b5e09aa47859157a71ffc959fdd", "file_sha256": "2e488b80ba2e7ecf66138af055e4b1dd824dd4c73d93c107662e667e031d2a60", "n_columns": 39, "valid": true}
- **v1.1.0** : {"exists": true, "path": "C:\\Users\\oussama\\Desktop\\pfe-d2f-enseignants\\esprit_D2F-predictive-analytics\\data\\clean\\training_corpus_provenanced_v110.csv", "n_rows": 172, "n_teachers": 40, "n_competencies": 13, "date_min": "2016-03-01", "date_max": "2026-07-22", "dataset_version": "v1.1.0", "has_provenance": true, "missing_required_columns": [], "provenance_classes": {"INSTITUTIONAL_RECORD": 172, "DEMO_SEED": 0, "UNKNOWN": 0}, "synthetic_share_pct": 0.0, "real_share_pct": 100.0, "source_types": {"postgresql_d2f": 172}, "forbidden_in_X_present": [], "target_stats": {"count": 172.0, "mean": 2.281, "std": 1.2542, "min": 0.0, "25%": 1.3333, "50%": 2.0, "75%": 3.3333, "max": 4.0}, "dataset_hash": "896609dbdd57d98f0e32e971af6a7357be4064c17d74301856db8abf917e2b47", "file_sha256": "66d222786622bb485987ddfc0853598768e6012307cd69d1724593303463bd16", "n_columns": 40, "valid": true}

- **global_valid** : True
## criteria
- **0% synthétique (aucune DEMO_SEED dans le corpus de production)** : true
- **100% INSTITUTIONAL_RECORD (source postgresql_d2f)** : true
- **colonnes de provenance présentes par ligne** : true
- **>= 50 lignes réelles** : true
- **aucune feature interdite dans X** : true
