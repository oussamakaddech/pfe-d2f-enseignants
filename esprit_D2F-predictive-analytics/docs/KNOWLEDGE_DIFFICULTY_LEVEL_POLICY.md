# Politique du niveau de difficulté des savoirs

## Principe

Le **niveau de difficulté** d'un savoir est un attribut **fixe** du référentiel pédagogique. Il représente la complexité ou la progression pédagogique du savoir et **ne varie jamais** selon l'enseignant.

## Règles

1. Le niveau est un entier de 1 à 5.
2. Le niveau est défini une seule fois dans le référentiel (table `knowledge`).
3. Le niveau est **immutable** pour un savoir donné — il ne change jamais.
4. Le niveau ne représente pas une note, une maîtrise ou une évaluation individuelle.
5. Le service d'affectation (`TeacherKnowledgeAssignment`) est la seule source de vérité pour les liens enseignant–savoir.
6. L'analyse prédictive **ne calcule jamais** un gap comme `niveau_requis - niveau_maitrise_enseignant`.

## Formule interdite

```diff
- gap = niveau_requis - niveau_maitrise_enseignant  # INTERDIT
```

Cette formule est invalide car le niveau est une difficulté fixe du savoir, pas une maîtrise personnelle de l'enseignant.

## Remplacement

Les gaps sont désormais des **défauts de couverture** détectés par les 8 types de gaps couverts par le moteur `predictive_gap_diagnostic.py`.