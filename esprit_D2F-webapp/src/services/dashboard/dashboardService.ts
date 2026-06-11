// Logique d'agrégation du tableau de bord (fonctions pures, testables).
// Aucune URL ici : la donnée provient des services existants (KPI, Analytics,
// Predictive, Besoins). Ce module ne fait que composer/dériver.

import type { DashboardData } from "@/models/analyse";
import type { DashboardAlert, DashboardHealth, HealthFactor, HealthLevel } from "@/models/dashboard";

const ROUTE_INACTIFS = "/home/analytics/enseignants-inactifs";
const ROUTE_BESOINS = "/home/besoins";
const ROUTE_ANALYTICS = "/home/analytics/dashboard";

interface HealthInput {
  readonly presence?: number;       // 0-100
  readonly coverage?: number;       // 0-100
  readonly participation?: number;  // 0-100
  readonly pendingNeeds?: number;   // count
  readonly atRisk?: number;         // count
  readonly totalTeachers?: number;
}

const PENDING_CAP = 20;
const ATRISK_CAP = 10;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function levelFromScore(score: number): HealthLevel {
  if (score >= 75) return "healthy";
  if (score >= 50) return "attention";
  return "critical";
}

/** Score de santé composite /100, pondéré sur les facteurs réellement disponibles. */
export function computeHealthScore(input: HealthInput): DashboardHealth {
  const raw: Array<HealthFactor | null> = [
    input.presence != null ? { key: "presence", label: "Taux de présence", score: clamp(input.presence), weight: 0.25 } : null,
    input.coverage != null ? { key: "coverage", label: "Couverture compétences", score: clamp(input.coverage), weight: 0.25 } : null,
    input.participation != null ? { key: "participation", label: "Participation", score: clamp(input.participation), weight: 0.15 } : null,
    input.pendingNeeds != null ? { key: "pending", label: "Besoins traités", score: clamp(100 - (Math.min(input.pendingNeeds, PENDING_CAP) / PENDING_CAP) * 100), weight: 0.15 } : null,
    input.atRisk != null ? { key: "atrisk", label: "Engagement enseignants", score: clamp(100 - atRiskRatio(input) * 100), weight: 0.20 } : null,
  ];
  const factors = raw.filter((f): f is HealthFactor => f !== null);
  if (factors.length === 0) {
    return { score: 0, level: "critical", factors: [] };
  }
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(factors.reduce((s, f) => s + f.score * (f.weight / totalWeight), 0));
  return { score, level: levelFromScore(score), factors };
}

function atRiskRatio(input: HealthInput): number {
  const atRisk = input.atRisk ?? 0;
  if (input.totalTeachers && input.totalTeachers > 0) {
    return Math.min(atRisk / input.totalTeachers, 1);
  }
  return Math.min(atRisk / ATRISK_CAP, 1);
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

/** Compose la file d'alertes priorisées à partir des signaux disponibles. */
export function composeAlerts(opts: {
  global?: DashboardData;
  inactifsTotal?: number;
  pendingNeeds?: number;
  seuilInactifsMois?: number;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const { global, inactifsTotal, pendingNeeds, seuilInactifsMois = 6 } = opts;

  if (inactifsTotal && inactifsTotal > 0) {
    alerts.push({
      id: "inactifs",
      severity: "WARNING",
      title: "Enseignants sans formation",
      message: `${inactifsTotal} enseignant(s) sans formation depuis plus de ${seuilInactifsMois} mois.`,
      cta: { label: "Voir la liste", to: ROUTE_INACTIFS },
    });
  }

  if (pendingNeeds && pendingNeeds > 0) {
    alerts.push({
      id: "besoins",
      severity: pendingNeeds >= 5 ? "WARNING" : "INFO",
      title: "Besoins en attente",
      message: `${pendingNeeds} besoin(s) de formation à traiter / affecter.`,
      cta: { label: "Traiter les besoins", to: ROUTE_BESOINS },
    });
  }

  for (const dept of global?.taux_couverture_departements ?? []) {
    if (dept.taux_couverture < 50 && dept.nb_evalues > 0) {
      alerts.push({
        id: `cov-${dept.departement}`,
        severity: "WARNING",
        title: `Couverture faible — ${dept.departement}`,
        message: `Couverture compétences à ${dept.taux_couverture}% (${dept.nb_evalues} évalués).`,
        cta: { label: "Analytique", to: ROUTE_ANALYTICS },
      });
    }
  }

  for (const a of (global?.alertes_recentes ?? []).slice(0, 6)) {
    const sev = (a.severite || "INFO").toUpperCase();
    if (sev === "INFO") continue; // on ne garde que ce qui exige une action
    alerts.push({
      id: `alert-${a.id}`,
      severity: sev === "CRITICAL" ? "CRITICAL" : "WARNING",
      title: a.titre,
      message: a.enseignant_id ? `Enseignant ${a.enseignant_id}` : "Alerte système",
      cta: { label: "Analytique", to: ROUTE_ANALYTICS },
    });
  }

  return alerts.sort((x, y) => (SEVERITY_ORDER[x.severity] ?? 9) - (SEVERITY_ORDER[y.severity] ?? 9));
}

/** Besoin considéré « en attente » tant qu'aucune validation finale (admin) n'est posée. */
export function isPendingBesoin(b: { approuveAdmin?: boolean; approuveCUP?: boolean; approuveChefDep?: boolean }): boolean {
  return !b.approuveAdmin;
}
