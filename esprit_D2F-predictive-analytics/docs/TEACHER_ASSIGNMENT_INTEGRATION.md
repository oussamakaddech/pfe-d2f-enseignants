# Intégration du service d'affectation enseignant

## Source de vérité

Le service d'affectation des compétences et savoirs aux enseignants est la **source de vérité** pour:
- Les savoirs associés à un enseignant
- Les compétences associées à un enseignant
- Le statut d'affectation (PROPOSED | ASSIGNED | VALIDATED | TO_REINFORCE | ARCHIVED)

## Modèles de données

### TeacherKnowledgeAssignment

| Champ | Format | Description |
|-------|--------|-------------|
| id | BigInteger | PK auto |
| teacher_id | String(36) | Format canonique ENSxxx |
| knowledge_id | BigInteger | FK vers knowledge |
| competency_id | BigInteger | FK optionnel vers compétence |
| assignment_status | String(20) | PROPOSED\|ASSIGNED\|VALIDATED\|TO_REINFORCE\|ARCHIVED |
| assignment_source | String(20) | RICE\|ADMIN\|CUP\|IMPORT\|INTEGRATION |
| assigned_at | DateTime | Date d'affectation |
| validated_at | DateTime nullable | Date de validation |
| active | Boolean | L'affectation est-elle active |
| data_quality_status | String(20) | COMPLETE\|PENDING_VALIDATION\|INCOMPLETE\|CONFLICT |

### TeacherCompetencyAssignment

| Champ | Format | Description |
|-------|--------|-------------|
| id | BigInteger | PK auto |
| teacher_id | String(36) | Format canonique ENSxxx |
| competency_id | BigInteger | FK vers compétence |
| assignment_status | String(20) | idem TeacherKnowledgeAssignment |
| active | Boolean | L'affectation est-elle active |

## Règles d'intégration

1. Le service prédictif **ne modifie pas** directement les affectations.
2. Toute modification des affectations nécessite une **validation humaine**.
3. Le service prédictif **lit** les affectations pour détecter les gaps de couverture.
4. Les IDs enseignants sont toujours normalisés au format ENSxxx.