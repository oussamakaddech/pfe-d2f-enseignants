// Modèles de l'analyse descriptive (features 1-4 + export) du module analytics.
// Aucun `any` : tous les DTO du backend ReportingEngine sont typés ici.

import type { NiveauRisque } from "./analytics";

export type Granularite = "SEMAINE" | "MOIS" | "TRIMESTRE" | "ANNEE";
export type Tendance = "HAUSSE" | "BAISSE" | "STABLE";
export type ExportExcelType = "INACTIFS" | "PAR_UP" | "PAR_DEPT";
export type ExportPdfType = "RAPPORT_MENSUEL" | "RAPPORT_ANNUEL";

// ── Feature 1 — Enseignants inactifs ─────────────────────────
export interface EnseignantInactif {
  enseignantId: string;
  nom: string;
  prenom: string;
  email: string;
  departement: string | null;
  up: string | null;
  derniereFormationDate: string | null;
  nombreMoisDepuisDerniereFormation: number | null;
  competencesEnDeclin: string[];
  scoreRisqueDecrochage: number;
  niveauRisque: NiveauRisque;
}

export interface EnseignantsInactifsResponse {
  total: number;
  page: number;
  size: number;
  items: EnseignantInactif[];
}

export interface EnseignantsInactifsParams {
  mois?: number;
  departement?: string;
  up?: string;
  page?: number;
  size?: number;
}

// ── Feature 2 — Formations par période ───────────────────────
export interface PeriodePoint {
  label: string;
  nombreFormations: number;
  nombreParticipants: number;
  tauxCompletion: number;
}

export interface FormationsParPeriodeResponse {
  granularite: Granularite;
  periodes: PeriodePoint[];
  totalFormations: number;
  totalParticipants: number;
  moyenneParPeriode: number;
  tendance: Tendance;
}

export interface FormationsParPeriodeParams {
  granularite?: Granularite;
  debut?: string;
  fin?: string;
  departement?: string;
  up?: string;
}

// ── Feature 3 — Analyse par UP ───────────────────────────────
export interface CompetenceDemandee {
  competenceId: number;
  competenceNom: string;
  nombre: number;
}

export interface AnalyticsUP {
  upId: string;
  upNom: string;
  departementNom: string | null;
  nombreEnseignants: number;
  nombreFormationsOrganisees: number;
  nombreParticipations: number;
  tauxParticipation: number;
  competencesLesPlusDemandees: CompetenceDemandee[];
  enseignantsSansFormation: number;
  scoreEngagement: number;
}

// ── Feature 4 — Analyse par département ───────────────────────
export interface AnalyticsDepartement {
  departementId: string;
  departementNom: string;
  nombreEnseignants: number;
  nombreFormationsOrganisees: number;
  nombreParticipations: number;
  tauxParticipation: number;
  enseignantsSansFormation: number;
  pourcentageARisque: number;
  niveauCompetenceMoyen: number;
  scoreEngagement: number;
}

export interface RadarPoint {
  departement: string;
  tauxParticipation: number;
  nombreFormations: number;
  niveauCompetenceMoyen: number;
  pourcentageARisque: number;
}

export interface AnalyticsDepartementResponse {
  departements: AnalyticsDepartement[];
  comparaisonRadar: RadarPoint[];
}
