# Audit Report: D2F Predictive Analytics Service

## Executive Summary (Résumé Exécutif)

L'audit du service d'analyse prédictive D2F a révélé des problèmes critiques de personnalisation des recommandations. Les enseignants reçoivent des profils et recommandations identiques ou quasi-identiques, ce qui contredit les objectifs pédagogiques du système.

## Critical Findings

### 1. ID Mismatch (TRÈS CRITIQUE)
- **Enseignants dans DB**: ENS001 - ENS027 (27 enseignants)
- **Enseignants en CSV**: T001 - T030 (30 enseignants)
- **Recommandations**: Mélange des deux formats
- **Impact**: Les profils T006, T007, T015 reçoivent des scores identiques (0.4143)

### 2. Gap Distribution Anomaly
| Teacher ID | Number of Gaps |
|------------|----------------|
| ENS023     | 149            |
| ENS012     | 76             |
| ENS010     | 69             |
| ...        | ...            |
| T003       | 8              |
| T006       | 8              |
| T007       | 8              |
| T015       | 8              |

### 3. Recommendation Concentration
- Tous les enseignants T00x ont des scores de recommandation identiques
- Formations recommandées: 301, 401, 601, 801, 101, 1201, 501, 701
- Même ordre de recommandations pour T006, T007, T015

## Root Causes Identified

### Data Generation Issues
1. **generate_training_corpus.py**:
   - Utilise `random_state=RANDOM_SEED + i` pour chaque échantillon
   - Génère des profils trop similaires
   - Manque de diversité contrôlée par département/UP

2. **Missing teacher competencies**:
   - T011, T014, T028 n'ont pas de données de compétences
   - Ces enseignants reçoivent des scores par défaut

### Gap Engine Issues
- `gap_engine.py` calcule correctement les gaps par enseignant
- Mais les profils ENS ont des centaines de gaps (simulation)
- Les profils T ont seulement 8 gaps

### Recommendation Engine Issues
- `_filter_candidates` utilise `niveau_actuel > 0 and nprq > niveau_actuel`
- Pour les enseignants avec `niveau_actuel = 0`, tous les candidats passent
- MSAS utilise des scores de pair similaires pour tous les enseignants

## Immediate Fixes Required

1. **Aligner les ID d'enseignant** entre DB et CSV
2. **Corriger le générateur de données** pour créer des profils diversifiés
3. **Vérifier la journalisation des gaps** - éviter les centaines de gaps par enseignant
4. **Implémenter un système de cache par teacher_id** propre

## Files to Audit

- `pipelines/generate_training_corpus.py`
- `app/engines/gap_engine.py`
- `app/engines/recommendation_engine.py`
- `app/services/data_service.py`
- `data/clean/teachers.csv`
- `data/clean/teacher_competencies.csv`