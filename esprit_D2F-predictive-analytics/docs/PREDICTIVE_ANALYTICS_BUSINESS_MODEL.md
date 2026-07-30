# Modèle métier — Service d'Analyse Prédictive D2F

## Hiérarchie du référentiel

```
Domaine
  → Compétence
      → Sous-compétence
          → Savoir
              → Niveau de difficulté (1-5, fixe)
```

## Règles fondamentales

1. Le **niveau de difficulté** appartient au Savoir ou à la Compétence — il est **fixe** dans le référentiel.
2. Le niveau **ne change pas** selon l'enseignant.
3. Le niveau **ne représente pas** une maîtrise individuelle ou une évaluation.
4. Le service d'affectation est la **source de vérité** pour les liens enseignant–savoir/compétence.
5. Le service d'analyse prédictive **ne modifie pas** directement le référentiel ni les affectations.

## Gaps (couverture)

Les gaps sont des **défauts de couverture**, pas des écarts de niveau :

| Type | Description |
|------|------------|
| GAP_NOT_ASSIGNED | Savoir pertinent non affecté à l'enseignant |
| GAP_PREREQUISITE_MISSING | Prérequis d'un savoir supérieur non couvert |
| GAP_TRAINING_NOT_COMPLETED | Savoir affecté mais formation non terminée |
| GAP_EXPLICIT_NEED | Besoin individuel exprimé par l'enseignant |
| GAP_COLLECTIVE_NEED | Besoin collectif CUP pour une UP/département |
| GAP_STALE_ASSIGNMENT | Affectation ancienne, non validée, sans activité récente |
| GAP_STRATEGIC_COVERAGE | Compétence critique manquante dans l'équipe/UP/département |
| GAP_DEMAND_TREND | Compétence en forte demande, couverture insuffisante |

## Score de priorité

Formule déterministe et explicable :

```
priority_score =
  0.25 × knowledge_difficulty_score
+ 0.20 × explicit_need_score
+ 0.15 × collective_need_score
+ 0.15 × prerequisite_gap_score
+ 0.10 × training_completion_score
+ 0.10 × assignment_freshness_score
+ 0.05 × strategic_impact_score
```

Tous les poids sont configurables via `app/config.py` (`settings.priority_weight_*`).
Niveau de priorité : FAIBLE (<0.25), MODEREE (≥0.25), HAUTE (≥0.50), CRITIQUE (≥0.75).