/**
 * notificationService.ts — Source de vérité REST pour les notifications réelles.
 *
 * Le service `notification-service` (microservice dédié, exposé via la gateway
 * sur /api/notifications) persiste de vraies notifications (issues des
 * événements métier RabbitMQ et de l'amorçage) et les pousse en temps réel via
 * WebSocket. Ce service consomme ces données réelles — aucune donnée simulée.
 */
import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
import type {
  AppNotification,
  NotificationCategory,
  NotificationPayload,
  NotificationSeverity,
} from '@/models/notification';

const BASE = `${config.NOTIFICATION_URL}/notifications`;

/** Mappe la réponse du backend (NotificationResponse) vers le modèle front. */
function toApp(n: Record<string, unknown>): AppNotification {
  const severity = String(n.severity ?? 'INFO').toLowerCase() as NotificationSeverity;
  return {
    id: String(n.id),
    type: String(n.type) as NotificationCategory,
    severity,
    title: String(n.title ?? ''),
    message: String(n.message ?? ''),
    read: Boolean(n.read),
    createdAt: n.createdAt ? String(n.createdAt) : new Date().toISOString(),
    link: n.link ? String(n.link) : undefined,
    actor: n.actor ? String(n.actor) : undefined,
    meta: (n.meta as Record<string, unknown>) ?? undefined,
  };
}

interface PageResponse {
  content: Record<string, unknown>[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const notificationService = {
  /** Liste les notifications de l'utilisateur authentifié (plus récentes d'abord). */
  async list(
    opts: { unreadOnly?: boolean; page?: number; size?: number } = {},
  ): Promise<AppNotification[]> {
    const { unreadOnly = false, page = 0, size = 100 } = opts;
    const res = await axios.get<PageResponse>(BASE, {
      params: { unreadOnly, page, size },
    });
    return (res.data.content ?? []).map(toApp);
  },

  /** Nombre de notifications non lues (badge). */
  async getUnreadCount(): Promise<number> {
    const res = await axios.get<{ total: number; unread: number }>(`${BASE}/count`);
    return res.data.unread ?? 0;
  },

  /** Marque une notification comme lue (côté serveur). */
  async markAsRead(id: string): Promise<void> {
    await axios.patch<void>(`${BASE}/${id}/read`);
  },

  /** Marque toutes les notifications comme lues. */
  async markAllAsRead(): Promise<void> {
    await axios.post<void>(`${BASE}/read-all`);
  },

  /** Supprime une notification. */
  async remove(id: string): Promise<void> {
    await axios.delete<void>(`${BASE}/${id}`);
  },

  /** Supprime toutes les notifications de l'utilisateur. */
  async clearAll(): Promise<void> {
    await axios.delete<void>(BASE);
  },

  /** Crée une notification (admin / outil d'amorçage de données réelles). */
  async create(payload: NotificationPayload): Promise<AppNotification> {
    const res = await axios.post<Record<string, unknown>>(BASE, {
      recipient: payload.recipient,
      type: payload.type,
      severity: payload.severity?.toUpperCase(),
      title: payload.title,
      message: payload.message,
      link: payload.link,
      actor: payload.actor,
      meta: payload.meta,
    } as Record<string, unknown>);
    return toApp(res.data);
  },
};

export default notificationService;
