/**
 * notificationService.ts — Source de vérité REST pour les notifications réelles.
 *
 * Le backend ne expose pas de WebSocket dédié aux notifications frontend ; en
 * revanche, le pipeline analytics produit de vraies alertes (dashboard global →
 * `alertes_recentes`). Ce service les récupère et les mappe vers le modèle
 * `AppNotification`, afin que le centre de notifications affiche des données
 * réelles plutôt que des messages simulés.
 */
import AnalyticsService from "@/services/analyse/AnalyticsService";
import type {
  AppNotification, NotificationCategory, NotificationSeverity,
} from "@/models/notification";

const ALERT_TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  GAP_CRITIQUE: "COMPETENCE",
  STAGNATION: "COMPETENCE",
  REGRESSION: "COMPETENCE",
  TENDANCE_DEPARTEMENT: "COMPETENCE",
  COMPLETION_FAIBLE: "FORMATION",
  BESOIN_NON_COUVERT: "BESOIN",
};

function mapSeverity(s?: string): NotificationSeverity {
  switch ((s ?? "").toUpperCase()) {
    case "CRITICAL": return "error";
    case "WARNING": return "warning";
    default: return "info";
  }
}

/** Récupère les alertes réelles du backend et les mappe en notifications. */
export async function fetchRealNotifications(limit = 20): Promise<AppNotification[]> {
  try {
    const data = await AnalyticsService.getDashboardGlobal();
    return (data.alertes_recentes ?? [])
      .slice(0, limit)
      .map((a) => ({
        id: `alert-${a.id}`,
        type: ALERT_TYPE_TO_CATEGORY[a.type_alerte] ?? "SYSTEM",
        severity: mapSeverity(a.severite),
        title: a.titre,
        message: a.enseignant_id ? `Concerne l'enseignant ${a.enseignant_id}` : "Alerte système",
        read: false,
        createdAt: a.created_at,
        link: "/home/analytics/dashboard",
        actor: a.enseignant_id ? "Analyse prédictive" : "Système",
      }));
  } catch {
    // Backend indisponible → pas de données simulées.
    return [];
  }
}
