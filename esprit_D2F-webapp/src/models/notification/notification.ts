/**
 * Modèle de domaine pour le système de notifications in-app (temps réel WebSocket).
 */

/** Gravité d'une notification — pilotée par la sémantique de l'UI. */
export type NotificationSeverity = "info" | "success" | "warning" | "error";

/** Catégorie métier de la notification (centrée sur les parcours D2F). */
export type NotificationCategory =
  | "FORMATION"
  | "EVALUATION"
  | "CERTIFICAT"
  | "BESOIN"
  | "COMPETENCE"
  | "SYSTEM"
  | "MESSAGE";

/** Une notification affichée dans le centre de notifications. */
export interface AppNotification {
  /** Identifiant stable (UUID ou id backend). */
  id: string;
  type: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  /** Lu / non lu — base du compteur de badges. */
  read: boolean;
  /** ISO-8601. */
  createdAt: string;
  /** Route interne optionnelle déclenchée au clic. */
  link?: string;
  /** Acteur ayant déclenché la notification (ex. « Chef Département »). */
  actor?: string;
  /** Métadonnées libres (id ressource, etc.). */
  meta?: Record<string, unknown>;
}

/** État de la connexion temps réel. */
export type ConnectionStatus = "connecting" | "open" | "closed" | "mock";

/** Contrat d'entrée pour créer/pousser une notification (sans id/état interne). */
export interface NotificationPayload {
  type: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  actor?: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
}

/** Message brut échangé sur le WebSocket (format attendu du backend). */
export interface NotificationSocketMessage {
  id?: string;
  type: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  actor?: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
}

/** Filtres disponibles dans le centre de notifications. */
export type NotificationFilter = "all" | "unread";
