# Guide de contribution — Plateforme D2F

## Stratégie de branches (GitFlow)

```
main          ← production, protégée (PR + review obligatoires)
develop       ← intégration continue, base de toutes les features
feature/*     ← nouvelles fonctionnalités
release/*     ← préparation d'une release
hotfix/*      ← corrections urgentes en production
```

### Créer une branche feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/mon-sujet
# ... travail ...
git push origin feature/mon-sujet
# Ouvrir une Pull Request vers develop
```

### Créer une release

```bash
git checkout develop
git checkout -b release/1.2.0
# Corrections mineures uniquement
git checkout main && git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release 1.2.0"
git checkout develop && git merge --no-ff release/1.2.0
git branch -d release/1.2.0
```

### Hotfix urgent

```bash
git checkout main
git checkout -b hotfix/fix-login-bug
# Correction ...
git checkout main && git merge --no-ff hotfix/fix-login-bug
git tag -a v1.1.1 -m "Hotfix login"
git checkout develop && git merge --no-ff hotfix/fix-login-bug
git branch -d hotfix/fix-login-bug
```

## Conventions de commit

Format : `type(scope): description courte`

| Type | Usage |
| :--- | :--- |
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Refactoring sans changement de comportement |
| `test` | Ajout ou modification de tests |
| `docs` | Documentation uniquement |
| `chore` | Outillage, dépendances, CI |
| `perf` | Amélioration de performance |

Exemples :
```
feat(besoin-formation): ajouter export PDF des besoins
fix(auth): corriger expiration du token JWT
docs(contributing): ajouter guide GitFlow
```

## Pull Request

- Cible : `develop` (sauf hotfix → `main`)
- Au moins 1 reviewer
- CI verte obligatoire avant merge
- Squash or rebase — pas de merge commit sur `main`

## Règles de sécurité

- Ne jamais commiter `.env`, clés API, mots de passe
- Utiliser `.env.example` pour documenter les variables requises
- Les secrets sont injectés via les variables d'environnement GitHub Actions
