import type { DataQualityStatus, GapSeverity, RecommendationPriority } from "../api/types";

export const SEVERITY_ORDER: Record<GapSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const SEVERITY_COLOR: Record<GapSeverity, string> = {
  LOW: "#52c41a",
  MEDIUM: "#faad14",
  HIGH: "#fa8c16",
  CRITICAL: "#f5222d",
};

export const PRIORITY_COLOR: Record<RecommendationPriority, string> = {
  LOW: "#52c41a",
  MEDIUM: "#faad14",
  HIGH: "#fa8c16",
  URGENT: "#f5222d",
};

export const QUALITY_COLOR: Record<DataQualityStatus, string> = {
  COMPLETE: "#52c41a",
  DATA_INCOMPLETE: "#faad14",
  MISSING_COMPETENCIES: "#fa8c16",
  STALE: "#722ed1",
  NO_DATA: "#f5222d",
};

export const QUALITY_LABEL: Record<DataQualityStatus, string> = {
  COMPLETE: "Complet",
  DATA_INCOMPLETE: "Données incomplètes",
  MISSING_COMPETENCIES: "Compétences manquantes",
  STALE: "Obsolète",
  NO_DATA: "Aucune donnée",
};

export function severityLabel(severity: GapSeverity): string {
  const labels: Record<GapSeverity, string> = {
    LOW: "Faible",
    MEDIUM: "Moyen",
    HIGH: "Élevé",
    CRITICAL: "Critique",
  };
  return labels[severity];
}

export function priorityLabel(priority: RecommendationPriority): string {
  const labels: Record<RecommendationPriority, string> = {
    LOW: "Priorité basse",
    MEDIUM: "Priorité moyenne",
    HIGH: "Priorité haute",
    URGENT: "Urgent",
  };
  return labels[priority];
}

export function riskLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    LOW: "Risque faible",
    MEDIUM: "Risque moyen",
    HIGH: "Risque élevé",
    CRITICAL: "Risque critique",
  };
  return labels[level] ?? level;
}

export function formatScore(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function formatHours(hours: number): string {
  if (!hours) return "—";
  return `${hours}h`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)} %`;
}

export function sortBySeverity<T extends { severity: GapSeverity }>(items: T[]): T[] {
  return [...items].sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
}
