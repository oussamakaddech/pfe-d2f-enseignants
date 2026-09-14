# Politique du niveau de difficulté des savoirs

## Principe

Le **niveau de difficulté** d'un savoir (`knowledge_difficulty_level`) est un
attribut **fixe** du référentiel pédagogique. Il représente la complexité ou
la progression pédagogique du savoir et **ne varie jamais** selon l'enseignant.

## Règles

1. Le niveau est un entier de 1 à 5.
2. Le niveau est défini une seule fois dans le référentiel (table `knowledge`).
3. Le niveau est **immutable** pour un savoir donné — il ne change jamais.
4. Le niveau ne représente pas une note, une maîtrise ou une évaluation individuelle.
5. Le service d'affectation (`TeacherKnowledgeAssignment`) est la seule source de vérité pour les liens enseignant–savoir.
6. L'analyse prédictive **ne calcule jamais** un gap comme `knowledge_difficulty_level - observed_result` pour mesurer la maîtrise de l'enseignant.

## Terminologie correcte

| Ancien terme (interdit) | Nouveau terme (obligatoire) |
|---|---|
| `current_level` (comme maîtrise) | `observed_result` (résultat réel observé) |
| `required_level` (comme label de compétence maîtrisée) | `knowledge_difficulty_level` (niveau de difficulté du savoir) |
| `niveau actuel de l'enseignant` | `résultat réel observé de l'enseignant` |
| `niveau requis de l'enseignant` | `niveau de difficulté du savoir` |

## Formule interdite

```diff
- gap = knowledge_difficulty_level - observed_result  # INTERDIT comme mesure de maîtrise
```

Cette formule est invalide car le niveau de difficulté est une propriété fixe
du savoir, pas une maîtrise personnelle de l'enseignant.

## Remplacement

Les gaps sont désormais des **défauts de couverture** détectés par les 8 types
de gaps couverts par le moteur `predictive_gap_diagnostic.py`.

## Règle de cible future (`gap_next_3m`)

La cible `gap_next_3m` n'est construite QUE si **deux observations réelles**
existent :
- une observation à la date t ;
- une observation réelle à t+3 mois.

Si aucune observation de maîtrise réelle n'existe à t+3 mois :
- laisser la cible à NaN ;
- exclure la ligne de l'entraînement supervisé ;
- produire un rapport de couverture ;
- ne pas extrapoler la cible ;
- ne pas générer de données synthétiques.