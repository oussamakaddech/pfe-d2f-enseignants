# Politique de recommandation de formation contextuelle

## Conditions d'éligibilité

Une formation est recommandée seulement si **toutes** les conditions suivantes sont remplies:

- [x] La formation est active
- [x] La formation n'est pas annulée
- [x] Les inscriptions sont ouvertes
- [x] Elle cible le savoir, sous-compétence ou compétence du gap
- [x] Elle respecte les restrictions départementales et UP
- [x] Elle n'est pas déjà terminée par l'enseignant
- [x] Les prérequis sont satisfaits (ou un parcours de prérequis est proposé)
- [x] Elle traite un gap actif
- [x] Son niveau cible est cohérent avec le niveau de difficulté du savoir

## Score de recommandation

```
recommendation_score =
  gap_priority
+ knowledge_training_relevance
+ prerequisite_readiness
+ availability
+ individual_need_alignment
+ collective_need_alignment
+ strategic_impact
+ historical_effectiveness (si données disponibles)
```

## Comportement des données manquantes

- Les composantes sans données sont `null`, jamais `0.5`.
- Un warning explicite est toujours ajouté quand une donnée est absente.