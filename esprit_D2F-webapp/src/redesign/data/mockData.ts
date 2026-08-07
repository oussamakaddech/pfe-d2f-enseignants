// ═══════════════════════════════════════════════════════════════════════════
// Jeu de données mock — aligné sur le contrat unifié (contract.ts).
//
// À utiliser pour les tests, le Storybook ou la prévisualisation hors-backend.
// Tous les scores de risque sont normalisés [0,1] et passent par le même
// `getRiskScore` / `riskLevelFromScore` que la production.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  UnifiedRiskTeacher,
  RiskDistribution,
  HeatmapCell,
  HeatmapDrillDown,
  SupplyDemandItem,
  ForecastView,
  CompetencyPressure,
  FormationReco,
} from '../contract';
import type { RiskLevelKey } from '../risk';

const DEPTS = [
  'Informatique',
  'Génie Logiciel',
  'Réseaux & Télécommunications',
  'Génie Civil',
  'Développement Web',
  'Intelligence Artificielle & Data',
];

function lvl(s: number): RiskLevelKey {
  if (s >= 0.75) return 'CRITIQUE';
  if (s >= 0.5) return 'ELEVE';
  if (s >= 0.25) return 'MODERE';
  return 'FAIBLE';
}

export const mockRiskTeachers: UnifiedRiskTeacher[] = [
  {
    id: 'ENS-2041',
    name: 'Amel Benali',
    department: 'Informatique',
    riskScore: 0.86,
    riskLevel: lvl(0.86),
    signals: ['Stagnation des compétences', 'Aucune formation récente'],
    trend: 'REGRESSION',
    criticalGaps: 3,
    recommendedAction: 'Planifier une formation Python avancé',
    recommendedTraining: 'Python pour la data',
    openAlerts: 2,
  },
  {
    id: 'ENS-1188',
    name: 'Karim Haddad',
    department: 'Génie Logiciel',
    riskScore: 0.79,
    riskLevel: lvl(0.79),
    signals: ['Écarts critiques'],
    trend: 'STABLE',
    criticalGaps: 2,
    recommendedAction: "Combler l'écart Architecture logicielle",
    recommendedTraining: 'Architecture logicielle avancée',
    openAlerts: 1,
  },
  {
    id: 'ENS-3310',
    name: 'Sofia Mansour',
    department: 'Développement Web',
    riskScore: 0.71,
    riskLevel: lvl(0.71),
    signals: ['Désengagement détecté'],
    trend: 'REGRESSION',
    criticalGaps: 1,
    recommendedAction: 'Entretien de suivi',
    recommendedTraining: null,
    openAlerts: 1,
  },
  {
    id: 'ENS-0922',
    name: 'Youssef Trabelsi',
    department: 'Génie Civil',
    riskScore: 0.63,
    riskLevel: lvl(0.63),
    signals: ['Besoins non couverts'],
    trend: 'STABLE',
    criticalGaps: 1,
    recommendedAction: 'Formation BIM',
    recommendedTraining: 'Bases du BIM',
    openAlerts: 0,
  },
  {
    id: 'ENS-4455',
    name: 'Nadia Cherif',
    department: 'Réseaux & Télécommunications',
    riskScore: 0.55,
    riskLevel: lvl(0.55),
    signals: ['Régression récente'],
    trend: 'PROGRESSION',
    criticalGaps: 0,
    recommendedAction: "Maintenir l'effort",
    recommendedTraining: null,
    openAlerts: 0,
  },
  {
    id: 'ENS-0773',
    name: 'Mehdi Slim',
    department: 'Informatique',
    riskScore: 0.34,
    riskLevel: lvl(0.34),
    signals: [],
    trend: 'PROGRESSION',
    criticalGaps: 0,
    recommendedAction: '—',
    recommendedTraining: null,
    openAlerts: 0,
  },
];

export const mockDistribution: RiskDistribution = {
  total: 128,
  byLevel: { CRITIQUE: 9, ELEVE: 21, MODERE: 44, FAIBLE: 54 },
  byDepartment: DEPTS.map((d, i) => ({
    department: d,
    avgRiskPct: [78, 41, 63, 52, 36, 45][i],
    teachers: [28, 24, 22, 30, 24, 20][i],
  })),
};

export const mockHeatmapCells: HeatmapCell[] = DEPTS.flatMap((dep, di) =>
  ['Python', 'SQL', 'React', 'Architecture', 'Réseaux', 'Machine Learning'].map((comp, ci) => ({
    department: dep,
    competenceId: ci + 1,
    competenceName: comp,
    avgGap: Number((Math.abs(Math.sin(di + ci)) * 3.4).toFixed(2)),
    teachersCount: Math.round(2 + Math.abs(Math.cos(di * ci)) * 10),
  })),
);

export const mockHeatmapDrill: HeatmapDrillDown = {
  department: 'Informatique',
  competenceName: 'Python',
  teachersCount: 12,
  avgGap: 2.4,
  teachers: [
    {
      teacherId: 'ENS-2041',
      name: 'Amel Benali',
      currentLevel: 1,
      requiredLevel: 4,
      gapScore: 2.4,
      urgency: 'CRITIQUE',
      stagnationMonths: 6,
      riskScore: 0.86,
      riskLevel: lvl(0.86),
    },
    {
      teacherId: 'ENS-0773',
      name: 'Mehdi Slim',
      currentLevel: 3,
      requiredLevel: 4,
      gapScore: 1.1,
      urgency: 'MODERE',
      stagnationMonths: 2,
      riskScore: 0.34,
      riskLevel: lvl(0.34),
    },
  ],
};

export const mockSupplyDemand: SupplyDemandItem[] = [
  {
    competenceId: 1,
    competenceName: 'Python',
    domain: 'Informatique',
    demandPct: 82,
    impactedTeachers: 31,
    criticalCount: 9,
    urgency: 'CRITIQUE',
    suggestedTraining: 'Python pour la data',
    quadrant: 'INVESTIR',
  },
  {
    competenceId: 3,
    competenceName: 'React',
    domain: 'Développement Web',
    demandPct: 64,
    impactedTeachers: 22,
    criticalCount: 3,
    urgency: 'ELEVE',
    suggestedTraining: 'Développement Frontend moderne avec React',
    quadrant: 'INVESTIR',
  },
  {
    competenceId: 4,
    competenceName: 'Architecture',
    domain: 'Génie Logiciel',
    demandPct: 48,
    impactedTeachers: 14,
    criticalCount: 1,
    urgency: 'MODERE',
    suggestedTraining: 'Architecture logicielle avancée',
    quadrant: 'SURVEILLER',
  },
  {
    competenceId: 2,
    competenceName: 'SQL',
    domain: 'Informatique',
    demandPct: 58,
    impactedTeachers: 18,
    criticalCount: 2,
    urgency: 'ELEVE',
    suggestedTraining: 'Bases de données',
    quadrant: 'MAINTENIR',
  },
];

export const mockForecastDemand: ForecastView = {
  kind: 'demand',
  horizonMonths: 6,
  series: [
    { period: 'Jan', value: 40, isProjection: false },
    { period: 'Fév', value: 44, isProjection: false },
    { period: 'Mar', value: 47, isProjection: false },
    { period: 'Avr', value: 46, isProjection: false },
    { period: 'Mai', value: 52, isProjection: false },
    { period: 'Juin', value: 55, isProjection: false },
    { period: 'Juil', value: 60, lower: 54, upper: 67, isProjection: true },
    { period: 'Août', value: 64, lower: 57, upper: 72, isProjection: true },
  ],
  note: 'Projection linéaire indicative sur 2 mois.',
};

export const mockDeclining: CompetencyPressure[] = [
  {
    competenceId: 4,
    name: 'Architecture',
    domain: 'Génie Logiciel',
    delta: -0.6,
    demandScore: null,
    gaps: 5,
  },
  {
    competenceId: 3,
    name: 'React',
    domain: 'Développement Web',
    delta: -0.3,
    demandScore: null,
    gaps: 3,
  },
];

export const mockInDemand: CompetencyPressure[] = [
  {
    competenceId: 1,
    name: 'Python',
    domain: 'Informatique',
    delta: null,
    demandScore: 82,
    gaps: 9,
  },
  { competenceId: 2, name: 'SQL', domain: 'Informatique', delta: null, demandScore: 58, gaps: 4 },
];

export const mockFormationRecos: FormationReco[] = [
  {
    formationId: 101,
    title: 'Python pour la data',
    recommendationCount: 31,
    avgScore: 4.4,
    successProb: 0.86,
  },
  {
    formationId: 102,
    title: 'Développement Frontend moderne avec React',
    recommendationCount: 22,
    avgScore: 4.1,
    successProb: 0.78,
  },
  {
    formationId: 103,
    title: 'Bases de données',
    recommendationCount: 18,
    avgScore: 3.9,
    successProb: 0.72,
  },
];

/** Couverture globale non calculable (cas limite à toujours gérer). */
export const mockCoverageNA = null;
