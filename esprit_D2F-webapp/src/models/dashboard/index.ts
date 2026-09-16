// Modèles du tableau de bord exécutif (agrégation front d'endpoints existants).
// Aucun `any` ; types des DTO composés côté client.

export type DashboardRangeKey = "30j" | "6m" | "12m" | "annee" | "custom";

export interface DashboardScope {
  readonly role: string;          // normalisé minuscule (admin|cup|enseignant|animateur)
  readonly isAdmin: boolean;
  readonly isCup: boolean;
  readonly isEnseignant: boolean;
  readonly isAnimateur: boolean;
  /** Bornes ISO yyyy-MM-dd pour les endpoints date-rangés. */
  readonly start: string;
  readonly end: string;
  readonly rangeKey: DashboardRangeKey;
}

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface DashboardAlert {
  readonly id: string;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly cta?: { readonly label: string; readonly to: string };
}

export type HealthLevel = "healthy" | "attention" | "critical";

export interface HealthFactor {
  readonly key: string;
  readonly label: string;
  /** Score normalisé du facteur dans [0, 100]. */
  readonly score: number;
  /** Poids relatif (la somme des poids vaut 1). */
  readonly weight: number;
}

export interface DashboardHealth {
  readonly score: number;        // 0-100
  readonly level: HealthLevel;
  readonly factors: readonly HealthFactor[];
}

export interface DashboardActivityItem {
  readonly id: string;
  readonly type: "formation" | "besoin";
  readonly title: string;
  readonly meta?: string;
  readonly date?: string;        // ISO
}
