# Politique de diagnostic des gaps de couverture

## Principe

Un gap dans D2F est un **défaut de couverture**, pas un écart entre niveau requis et niveau de maîtrise. La formule `gap = niveau_requis - niveau_maitrise_enseignant` est **interdite**.

## 8 types de gaps autorisés

1. **GAP_NOT_ASSIGNED** — Un savoir pertinent n'est pas affecté à l'enseignant
2. **GAP_PREREQUISITE_MISSING** — Un savoir de niveau supérieur est pertinent mais un prérequis n'est pas couvert
3. **GAP_TRAINING_NOT_COMPLETED** — Un savoir est affecté mais aucune formation liée n'est terminée
4. **GAP_EXPLICIT_NEED** — L'enseignant a exprimé un besoin individuel
5. **GAP_COLLECTIVE_NEED** — Un CUP a exprimé un besoin collectif pour une UP ou un département
6. **GAP_STALE_ASSIGNMENT** — Affectation ancienne, non validée, sans activité récente
7. **GAP_STRATEGIC_COVERAGE** — Compétence/savoir critique manque dans une équipe, UP ou département
8. **GAP_DEMAND_TREND** — Compétence en forte demande, couverture insuffisante

## Score de priorité

Tous les poids sont configurables dans `app/config.py`. Les scores sont normalisés entre 0 et 1 et les composantes nulles (manque de données) restent nulles — jamais 0.5.

## Source des données

- Service d'affectation ( TeacherKnowledgeAssignment, TeacherCompetencyAssignment )
- Référentiel compétences (Knowledge)
- Besoins individuels (AlertEvent type BESOIN_NON_COUVERT)
- Besoins collectifs CUP (AlertEvent cible_type DEPARTEMENT)
- Formations suivies (TrainingPath/TrainingPathItem)
- Historique des événements (AlertEvent)