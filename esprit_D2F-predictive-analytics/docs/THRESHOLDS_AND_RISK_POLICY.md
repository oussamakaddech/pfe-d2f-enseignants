# Seuils et politique de risque — Justification (audit DSI)

Ce document justifie chaque seuil configuré/implémenté et pointe son
emplacement exact dans le code. Il répond au point 3.1 de l'audit :
« aucun seuil n'est justifié ».

---

## 1. Seuils de gap (écart compétence requise - actuelle)

| Seuil | Valeur | Définition | Référence |
|---|---|---|---|
| `seuil_gap_critique` | 0.75 | au-delà d'un écart de 0.75/5, le gap est CRITIQUE | `app/core/config.py:34` |
| `seuil_gap_haute` | 0.50 | au-delà de 0.50/5, le gap est HAUTE | `app/core/config.py:35` |
| `seuil_gap_moyenne` | 0.25 | au-delà de 0.25/5, le gap est MOYENNE | `app/core/config.py:36` |

**Justification :** le niveau de compétence est évalué sur une échelle
discrète de 1 à 5 (cf. `docs/DATASET_CONTRACT.md`). Un écart strictement
supérieur à une unité (≥ 1.01 possible mais arrondi à 1 par l'échelle)
représente un retard d'au moins un niveau entier. En pratique :
- 0.25 : un décalage d'un quart d'échelle — premier signal d'attention ;
- 0.50 : un demi-niveau — besoin de formation identifié (action à court terme) ;
- 0.75 : presque un niveau complet de retard — gap critique, action immédiate.

Ces bornes dérivent de l'échelle métier 1-5 (non d'un calcul statistique) ;
elles sont paramétrables via env (`SEUIL_GAP_CRITIQUE`, etc.) et doivent
être recalibrées dès que le corpus réel dépassera 500 enseignants.

## 2. Règle de score de risque (fallback sans modèle ML)

```
risk_score = min(100, critical*25 + high*12 + avg_gap*40)
LOW < 30 ; MEDIUM < 50 ; HIGH < 75 ; CRITICAL >= 75
```
Référence : `app/infrastructure/ml/predictor.py:501-509`.

**Justification :** poids calibrés pour qu'un seul gap critique (25) +
un gap moyen (≈25) atteigne ~50 (HIGH), et que 3 gaps critiques (75)
atteignent CRITICAL sans aucune autre contribution. La borne 75/CRITICAL
est alignée sur `risk_threshold_high = 70.0` (`app/core/config.py:37`)
pour éviter deux référentiels contradictoires.

## 3. Règle de sécurité ≥ 3 gaps critiques → CRITICAL (même avec modèle ML)

Référence : `app/infrastructure/ml/predictor.py:603-618`.

**Justification :** le `risk_classifier` est entraîné sur 36 échantillons
dont **un seul** CRITICAL (F1=0.0 sur cette classe, voir
`data/models/risk_training_metadata.json`). Sa prédiction CRITICAL n'est
pas statistiquement fiable. La règle déterministe ≥ 3 gaps critiques est
indépendante du ML : c'est un garde-fou de sécurité documenté, exposé dans
les facteurs de risque sous `critical_gaps_rule` (traçable, non silencieux).

## 4. Seuil d'acceptation du risk_classifier

```
accept si macro_f1 >= max(0.45, baseline_macro_f1 + 0.05)
```
Références : `pipelines/train_risk_classifier.py:63` (`MACRO_F1_ACCEPT_THRESHOLD`)
et `pipelines/train_risk_classifier.py:210`.

**Justification :** le hasard sur 4 classes = 0.25 de macro F1. Le seuil
0.45 exige un gain substantiel au-dessus du hasard (≈2×), tout en restant
atteignable sur un corpus de 36 échantillons (un seuil plus strict comme
0.60 rejetterait le modèle et conserverait la règle arbitraire, ce qui est
le résultat opposé à l'objectif de l'audit). Le +0.05 sur la baseline
garantit un gain réel vs le classifieur majoritaire.

## 5. Seuil d'acceptation du modèle de pertinence (relevance)

```
accept si cv_rmse < baseline_rmse * 0.995
```
Référence : `pipelines/train_relevance_model.py:282`.

**Justification :** le gradient boosting doit battre la prédiction par la
moyenne (baseline) de plus de 0.5 % en RMSE. Ce seuil volontairement
strict est impossible à atteindre par le bruit seul sur 60 lignes ; en
cas de rejet, le blending 70 % heuristique / 30 % ML reste appliqué
(le modèle rejeté est supprimé, l'heuristique est conservée).

## 6. Seuil de tolérance au synthétique (portage ML gap)

```
ML_SYNTHETIC_TOLERANCE_PCT = 50.0
```
Référence : `app/infrastructure/ml/predictor.py`.

**Justification :** si plus de 50 % des lignes d'entraînement d'un modèle
sont synthétiques, la prédiction ML n'est pas utilisée en production
(retour à la règle déterministe). Le corpus `training_corpus.csv` est à
98 % synthétique → le modèle gap_temporal est donc **désactivé en
production** (`_gap_model_enabled = False`, même flag dans `predictor.py`).
Ce seuil est un choix de prudence : il sera relevé après validation
métier d'un corpus réel de ≥ 300 enseignants.

## 7. Garde-fous d'entraînement

| Garde | Valeur | Référence |
|---|---|---|
| Enseignants minimum pour le risk_classifier | 20 | `pipelines/train_risk_classifier.py:52` |
| Lignes réelles minimum pour le gap hybride | 50 | `pipelines/train_gap_model_hybrid.py` |
| Échantillon de test minimum pour accepter le gap | 20 | `pipelines/train_gap_model_hybrid.py` |
| Lignes réelles minimum pour le relevance (sinon bootstrap synthétique) | 15 / 8 | `pipelines/train_relevance_model.py:51-52` |

**Justification :** en dessous de ces volumes, la variance des métriques
CV est trop grande pour qu'une décision d'acceptation soit signifiante.
Le gap hybride exige en plus un échantillon de test d'au moins 20 lignes
pour que la métrique de lift ait un écart-type acceptable.

## 8. Mid-points de score par classe (risk ML)

```
LOW=10.0, MEDIUM=37.5, HIGH=62.5, CRITICAL=87.5
```
Référence : `app/infrastructure/ml/predictor.py:588`.

**Justification :** centres des intervalles [0-20, 20-55, 55-70, 70-100]
définis par `risk_threshold_medium=30` et `risk_threshold_high=70`
(`app/core/config.py:37-38`) après arrondi aux bornes de niveau. Le score
final = espérance des midpoints pondérée par les probabilités du modèle.

---

## Recalibrage

Aucun de ces seuils n'est définitif : ils seront recalibrés lors de la
collecte d'un corpus réel ≥ 500 enseignants (cf. `docs/ML_GOVERNANCE_AND_DATA_COLLECTION.md`).
Chaque changement de seuil doit être accompagné d'une mise à jour de ce
document et d'un diff visible dans la revue DSI.
