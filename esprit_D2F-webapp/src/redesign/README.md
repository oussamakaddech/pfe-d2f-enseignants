# Redesign — Analyse Prédictive & Tableau de bord exécutif (D2F)

Refonte premium, production-grade et sans ambiguïté métrique de deux pages
stratégiques de pilotage (administrateurs). Le livrable est **autonome** dans
`src/redesign/` et se branche sur les hooks/services existants sans casser
l'existant.

---

## 1. Product / UX Redesign Rationale

Le diagnostic de la version précédente (pages `glass`) révélait de vraies
failles de confiance dans les données :

- **Deux échelles de risque coexistaient** (`attrition_risk_score` [0,1] vs
  `scoreRisqueDecrochage` 0–100), produisant des valeurs contradictoires entre
  pages.
- **Labels instables** : « Risque d'attrition », « Score de risque »,
  « computedRisk » désignaient la même chose.
- **Range selector cosmétique** sur le dashboard : `rangeToDates` était calculé
  mais jamais transmis aux hooks → faux contrôle.
- **Avatar depuis l'id** (`teacher_name ?? teacher_id` puis `.slice(0,2)`) au
  lieu du nom réel.
- **Couverture en `0 %`** au lieu de « Non calculable » par endroits ; vocabulaire
  `—` vs `NA_CALC` incohérent.
- **Pas d'état d'erreur** sur le dashboard (un simple `Alert` brut, sans retry).
- **Logique de signal dupliquée** et deux `RiskBadge` se chevauchant.

### Principes de la refonte
1. **Une seule source de vérité du risque** (`src/redesign/risk.ts` → `utils/risk.ts`).
2. **Une seule échelle**, une seule couleur sémantique, un seul badge.
3. **Aucune valeur null transformée en zéro** : `NA_CALC` partout via `states.ts`.
4. **Les sélecteurs de période pilotent réellement les hooks** (ou n'existent pas).
5. **Chaque état existe** : skeleton calé sur le layout, empty, error+retry, loading.
6. **Densité élégante**, surfaces nettes (fin du glassmorphism overload), dark/light.

---

## 2. Information Architecture

### Page 1 — Analyse Prédictive (`PredictiveAnalyticsPage.tsx`)
```
Hero (titre, Maj, statut modèle, Ré-entraîner*, Rafraîchir)
├─ Aide contextuelle (dismissable)
B. KPI ribbon (6)        — analysés · risque moyen · prioritaires · écarts · alertes · couverture
C. Risk intelligence      — [RiskCompass]  | [Top priority teachers]
D. Skill gaps             — SkillHeatmap (clic → Drawer drilldown enseignants)
E. Supply vs demand       — SupplyDemandMatrix (triée par urgence)
F. Forecast               — Segmented(Demande/Besoins/Risque) + Horizon réel (6/12m)
G. Executive summary      — synthèse narrative + actions prioritaires + alertes
```

### Page 2 — Tableau de bord exécutif (`ExecutiveDashboardPage.tsx`)
```
Hero (greeting, date, thème, Rafraîchir, lien Analytique)
B. Top KPI (6)            — à risque · couverture · déclin · alertes · formations · santé
C. Platform health        — HealthGauge + facteurs + couverture/dépt
D. Risk & training impact — [Top at-risk] | [Efficacité formations]
E. Compétences en tension — [Déclin] | [Forte demande]
F. Tendance & alertes     — [TrendChart] | [Alertes récentes + sévérité]
G. Formations recommandées — liste rankée (clic → Drawer détail)
```
> **Pas de range selector** sur le dashboard : les données globales ne sont pas
> date-rangées par le backend → un sélecteur y serait factice (RÈGLE #4).

---

## 3. Component Tree

```
src/redesign/
├─ risk.ts                 # source de vérité risque (score, niveau, couleurs, NA)
├─ format.ts               # formatters null-safe + buildTrend + initialsFromName
├─ contract.ts             # types unifiés (UnifiedRiskTeacher, Heatmap*, Forecast…)
├─ useUnified.ts           # hooks de normalisation (DTO → modèle unique)
├─ redesign.css            # design system (surfaces, dark/light, sémantique)
├─ data/mockData.ts        # fixture alignée au contrat
├─ components/
│  ├─ Section.tsx          # SectionShell + Card
│  ├─ KpiCard.tsx          # KPI premium (loading / NA / trend réel)
│  ├─ Risk.tsx             # RiskBadge + RiskTag + HelpTip (UN badge)
│  ├─ States.tsx           # EmptyState / ErrorState / Skeletons calés
│  ├─ PriorityTeacherCard.tsx
│  ├─ HealthGauge.tsx
│  └─ charts/
│     ├─ RiskCompass.tsx
│     ├─ ForecastChart.tsx
│     ├─ SkillHeatmap.tsx
│     ├─ SupplyDemandMatrix.tsx
│     └─ TrendChart.tsx
├─ PredictiveAnalyticsPage.tsx
└─ ExecutiveDashboardPage.tsx
```

---

## 4. Design System Choices

- **Surfaces nettes** (`--rd-surface`) plutôt que verre dépoli : lisibilité +
  sérénité « executive », ombres douces `sm/md/lg`.
- **Couleurs sémantiques de risque constantes** (Faible=vert, Modéré=amber,
  Élevé=orange, Critique=rouge) — identiques aux deux pages et aux charts.
- **« Non calculable » en neutre ambre**, jamais rouge (RÈGLE #3).
- **Typo Inter**, hiérarchie forte (hero 28px/800 → KPI 28px/800 → body 13px).
- **Espacement système** (`--rd-space-*`), grilles `auto-fit` responsives.
- **Dark/Light** via `[data-theme]` (toggle sur le dashboard exécutif).
- **Microinteractions** : hover elevation, transitions de barres/anneaux,
  skeletons shimmer, Drawer/Modal AntD réutilisés (pas de wrapper maison).
- **Tokens réutilisés** : `tokens.ts`, `states.ts`, `utils/risk.ts`, `RiskBadge`,
  `UserAvatar`, `KpiCard`, `Skeleton` existants — pas de doublon.

---

## 5. Implémentation (React + TypeScript)

Les fichiers livrés sont complets et typés (`tsc` ✅, `eslint` ✅). Les pages
consomment **uniquement** les hooks unifiés (`useUnified*`) ; aucun recalcul de
risque côté rendu. Tous les scores passent par `getRiskScore()` puis `RiskBadge`.

---

## 6. Composants réutilisables partagés

| Composant | Rôle | États |
|---|---|---|
| `RiskBadge` | Badge de risque unique (score→niveau→couleur) | null → « Non calculable » |
| `KpiCard` | Tuile KPI premium | loading skeleton, NA neutre, trend réel ou absent |
| `Section` / `Card` | Coquille de section + carte | sticky optionnel |
| `PriorityTeacherCard` | Enseignant prioritaire (avatar=nom, signaux, action) | — |
| `HealthGauge` | Jauge SVG santé | — |
| `RiskCompass` / `ForecastChart` / `SkillHeatmap` / `SupplyDemandMatrix` / `TrendChart` | Dataviz SVG natives, responsives | skeleton / empty |
| `States` | Empty / Error(+retry) / Skeletons | — |

---

## 7. Mock data shape (aligned with one source of truth)

`src/redesign/data/mockData.ts` expose des fixtures typées sur `contract.ts` :
`mockRiskTeachers`, `mockDistribution`, `mockHeatmapCells`, `mockHeatmapDrill`,
`mockSupplyDemand`, `mockForecastDemand`, `mockDeclining`, `mockInDemand`,
`mockFormationRecos`. **Tous les scores sont [0,1]** et passent par le même
`getRiskScore` / `riskLevelFromScore` que la prod. `mockCoverageNA = null`
démontre le cas « Non calculable ».

---

## 8. Backend contract changes required

1. **Un seul champ de risque normalisé [0,1]** exposé partout
   (`score_risque` / `attrition_risk_score`). Si le backend tient un 0–100,
   normaliser côté service (déjà fait dans `AnalysePredictiveService`).
2. **Seuils fixés** : Faible<40 · Modéré40–59 · Élevé60–79 · Critique≥80
   (documentés via `RISK_THRESHOLDS`). Ne pas introduire d'autre classification.
3. **Couverture** : renvoyer `null` (ou `nb_evalues=0`) quand non calculable,
   **jamais 0**. Le front affiche « Non calculable ».
4. **Heatmap drilldown** : `GET /gap-heatmap/{dept}/{comp}` doit renvoyer les
   enseignants avec `score_risque` (et non que `enseignant_id`).
5. **Range selector** : si ajouté au dashboard, le backend doit exposer un
   endpoint date-rangé ; sinon ne pas l'afficher (fait ici).
6. **Champs département** : normaliser `department → departement` dans le
   service (déjà fait) ; le front n'utilise que `departement`.
7. **Noms enseignants** : exposer `teacher_name` réel (pas que l'id) pour
   l'avatar et les listes.

---

## 9. Issues fixed from previous version

| # | Problème | Correction |
|---|---|---|
| 1 | Risques contradictaires (2 échelles) | `getRiskScore()` unique + `RiskBadge` unique ; plus de 0–100 côté rendu |
| 2 | `department` mismatch | Normalisé dans le service ; le front lit `departement` partout |
| 3 | Avatar depuis l'id | `PriorityTeacherCard` utilise `UserAvatar` + `splitName(name)` |
| 4 | Pas d'état d'erreur dashboard | `ErrorState` + `refetch()` sur les 2 pages |
| 5 | Range selector factice | Supprimé du dashboard ; sur la prédictive il pilote `useDemandForecast`/`useTrainingNeedsForecast`/`useRiskEvolution` |
| 6 | Logique de signal dupliquée | `decodeSignals()` centralisé dans `utils/risk.ts` |
| 7 | Seuils inconsistants | `riskLevelFromScore()` unique (source `utils/risk.ts`) |
| 8 | `staleTime`/refetch incohérents | `handleRefresh` invalide `["analyse"]` + `["dashboard"]` ; cohérent |
| 9 | « Risque d'attrition » vs « Score de risque » | Un seul libellé « Risque » + pourcentage, partout |
| 10 | Couverture en 0 au lieu de NA | `toCoveragePercent()` → `NA_CALC` quand non calculable |
| 11 | Deux `RiskBadge` | Le badge level-based (`charts/RiskBadge`) n'est plus utilisé par les pages |
| 12 | Skeletons non calés | `KpiSkeleton`/`ChartSkeleton`/`ListSkeleton` reproduisent le layout |

---

## Intégration

`src/routes/index.tsx` pointe désormais :
- `/home` → `ExecutiveDashboardPage`
- `/home/AnalysePredictive` → `PredictiveAnalyticsPage`

Les anciennes pages (`pages/dashboard/DashboardGlass`, `pages/analyse/AnalysePredictivePage`)
restent intactes (non supprimées) pour rollback / tests.
