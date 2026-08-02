# Fichier deprecated — a ne plus utiliser

**`training_metadata.json`** (a cote) est LEGACY et trompeur. Il correspond a
l'ancien `train_model.py` qui entrainait sur seulement **80 echantillons** avec
des features constantes (`required_level` min=max=5.0, `taux_assiduite`=0.8, …),
produisant des metriques **parfaitement impossibles** (`test_r2: 1.0`,
`test_rmse: 0.0`, `baseline_rmse: 0.0`).

Il est conserve uniquement pour historique. **Ne pas s'y fier.**

→ Le seul fichier de reference valide est **`temporal_training_metadata.json`**,
  produit par `pipelines/train_gap_model.py` (ou `pipelines/train_gap_model_hybrid.py`).
  Ce fichier contient des metriques **reelles** sur 5000+ echantillons avec une
  baseline de persistance explicite, un lift calcule, et les feature_ranges
  necessaires au serving (anti train/serve skew).
