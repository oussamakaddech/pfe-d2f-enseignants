/**
 * Constantes centralisées du feature-module Analytics.
 */
import type { NiveauRisque, NiveauUrgence, SeveriteAlerte } from "@/models/analyse/analyticsFeature";

export const ANALYTICS_ROUTES = {
  teacher: (id: string) => `/home/analytics/teacher/${id}`,
  dashboard: "/home/analytics/dashboard",
  monitoring: "/home/analytics/monitoring",
  heatmap: "/home/analytics/heatmap",
} as const;

export const RISK_LEVEL_ORDER: NiveauRisque[] = ["FAIBLE", "MODERE", "ELEVE", "CRITIQUE"];

export const RISK_LEVEL_COLORS: Record<NiveauRisque, string> = {
  FAIBLE: "#52c41a",
  MODERE: "#faad14",
  ELEVE: "#fa8c16",
  CRITIQUE: "#f5222d",
};

export const URGENCE_COLORS: Record<NiveauUrgence, string> = {
  FAIBLE: "default",
  MODEREE: "blue",
  HAUTE: "orange",
  CRITIQUE: "red",
} as unknown as Record<NiveauUrgence, string>;

export const SEVERITE_COLORS: Record<string, string> = {
  INFO: "blue",
  WARNING: "orange",
  CRITICAL: "red",
  CRITIQUE: "red",
  HAUTE: "orange",
  MOYENNE: "blue",
};

/** Cycle de vie d'une alerte (F5) : libellés + couleurs de badge. */
export const STATUT_ALERTE_LABELS: Record<string, string> = {
  NOUVELLE: "Nouvelle",
  LUE: "En cours",
  TRAITEE: "Résolue",
  IGNOREE: "Ignorée",
  ESCALADEE: "Escaladée",
};

export const STATUT_ALERTE_COLORS: Record<string, string> = {
  NOUVELLE: "blue",
  LUE: "cyan",
  TRAITEE: "green",
  IGNOREE: "default",
  ESCALADEE: "red",
};

/** Statuts considérés « ouverts » pour les compteurs de priorité. */
export const ALERT_STATUTS_OUVERTS = ["NOUVELLE", "LUE"];

export const RISK_LEVEL_LABELS: Record<NiveauRisque, string> = {
  FAIBLE: "Faible",
  MODERE: "Modéré",
  ELEVE: "Élevé",
  CRITIQUE: "Critique",
};

export const PAGE_SIZE = 20;

// Seuils de catégorisation du score de risque (alignés sur le backend).
export const RISK_THRESHOLDS = {
  modere: 0.25,
  eleve: 0.5,
  critique: 0.75,
} as const;
