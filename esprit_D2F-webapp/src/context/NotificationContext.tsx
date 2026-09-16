/**
 * NotificationContext.tsx — État global du centre de notifications.
 *
 * Responsabilités :
 *  - Source de vérité = service `notification-service` (REST via gateway).
 *    Au montage, les vraies notifications de l'utilisateur sont chargées depuis
 *    le backend (persistées, issues des événements métier réels).
 *  - Ouvre le transport temps réel (WebSocket réel / mock démo) et ingère les
 *    notifications poussées par le serveur, sans aucune donnée simulée.
 *  - Expose les actions : marquer comme lu, tout marquer lu, supprimer, vider —
 *    chacune synchronisée avec le backend.
 */
import {
  createContext, memo, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { useImmer } from "use-immer";
import type { ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  AppNotification, ConnectionStatus, NotificationPayload, NotificationSocketMessage,
} from "@/models/notification";
import { config } from "@/config/env";
import { createNotificationTransport } from "@/services/notification";
import { notificationService } from "@/services/notification/notificationService";
import { useAuth } from "@/hooks/auth";

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  status: ConnectionStatus;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
  addNotification: (payload: NotificationPayload) => void;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const STORAGE_PREFIX = "d2f_notifications_";
const MAX_NOTIFICATIONS = 100;

interface NotificationProviderProps {
  children: ReactNode;
}

function storageKeyFor(userId: string | number | undefined): string {
  return `${STORAGE_PREFIX}${userId ?? "anonymous"}`;
}

function mergeBackendNotifications(draft: AppNotification[], real: AppNotification[]): void {
  const existing = new Set(draft.map((n) => n.id));
  real.forEach((n) => {
    if (!existing.has(n.id)) draft.unshift(n);
  });
  draft.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (draft.length > MAX_NOTIFICATIONS) draft.length = MAX_NOTIFICATIONS;
}

function loadPersisted(userId: string | number | undefined): AppNotification[] {
  try {
    const raw = sessionStorage.getItem(storageKeyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toNotification(msg: NotificationSocketMessage): AppNotification {
  return {
    id: msg.id ?? uuidv4(),
    type: msg.type,
    severity: msg.severity,
    title: msg.title,
    message: msg.message,
    read: msg.read ?? false,
    createdAt: msg.createdAt ?? new Date().toISOString(),
    link: msg.link,
    actor: msg.actor,
    meta: msg.meta,
  };
}

function applyIncomingNotification(draft: AppNotification[], msg: NotificationSocketMessage): void {
  const notification = toNotification(msg);
  const idx = draft.findIndex((n) => n.id === notification.id);
  if (idx !== -1) {
    draft[idx] = { ...draft[idx], ...notification };
    return;
  }
  draft.unshift(notification);
  if (draft.length > MAX_NOTIFICATIONS) draft.length = MAX_NOTIFICATIONS;
}

const NotificationProvider = memo(function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const userId = user?.userId;

  const [notifications, setNotifications] = useImmer<AppNotification[]>(
    () => loadPersisted(userId),
  );
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const transportRef = useRef<ReturnType<typeof createNotificationTransport> | null>(null);

  // Persistance par utilisateur (recherche au changement d'utilisateur).
  useEffect(() => {
    setNotifications(loadPersisted(userId));
  }, [userId, setNotifications]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKeyFor(userId), JSON.stringify(notifications));
    } catch {
      /* quota / mode privé — on ignore */
    }
  }, [notifications, userId]);

  // Chargement initial des VRAIES notifications depuis le backend.
  useEffect(() => {
    let cancelled = false;
    notificationService.list({ size: MAX_NOTIFICATIONS })
      .then((real) => {
        if (cancelled) return;
        setNotifications((draft) => { mergeBackendNotifications(draft, real); });
        if (!config.NOTIFICATIONS_WS_URL) setStatus("open");
      })
      .catch(() => {
        if (!config.NOTIFICATIONS_WS_URL) setStatus("closed");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, setNotifications]);

  // Connexion au transport temps réel (WebSocket réel, REST, ou démo).
  useEffect(() => {
    const transport = createNotificationTransport(config.NOTIFICATIONS_WS_URL, {
      onMessage: (msg) => {
        setNotifications((draft) => {
          applyIncomingNotification(draft, msg);
        });
      },
      onStatus: (s) => setStatus(s),
      onError: () => setStatus("closed"),
    });
    transportRef.current = transport;
    transport.connect();
    return () => {
      transport.close();
      transportRef.current = null;
    };
  }, [setNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((draft) => {
      const target = draft.find((n) => n.id === id);
      if (target) target.read = true;
    });
    notificationService.markAsRead(id).catch(() => { /* best-effort */ });
  }, [setNotifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications((draft) => {
      draft.forEach((n) => { n.read = true; });
    });
    notificationService.markAllAsRead().catch(() => { /* best-effort */ });
  }, [setNotifications]);

  const remove = useCallback((id: string) => {
    setNotifications((draft) => {
      const idx = draft.findIndex((n) => n.id === id);
      if (idx !== -1) draft.splice(idx, 1);
    });
    notificationService.remove(id).catch(() => { /* best-effort */ });
  }, [setNotifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    notificationService.clearAll().catch(() => { /* best-effort */ });
  }, [setNotifications]);

  const addNotification = useCallback((payload: NotificationPayload) => {
    if (payload.recipient) {
      // Création côté serveur (données réelles) si un destinataire est fourni.
      notificationService.create(payload).catch(() => {
        // Fallback local si pas de droits / service indisponible.
        setNotifications((draft) => {
          const notification: AppNotification = {
            id: uuidv4(),
            read: false,
            createdAt: payload.createdAt ?? new Date().toISOString(),
            ...payload,
          } as AppNotification;
          draft.unshift(notification);
          if (draft.length > MAX_NOTIFICATIONS) draft.length = MAX_NOTIFICATIONS;
        });
      });
      return;
    }
    setNotifications((draft) => {
      const notification: AppNotification = {
        id: uuidv4(),
        read: false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        ...payload,
      } as AppNotification;
      draft.unshift(notification);
      if (draft.length > MAX_NOTIFICATIONS) draft.length = MAX_NOTIFICATIONS;
    });
  }, [setNotifications]);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => (n.read ? acc : acc + 1), 0),
    [notifications],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications, unreadCount, status,
      markAsRead, markAllAsRead, remove, clearAll, addNotification,
    }),
    [notifications, unreadCount, status, markAsRead, markAllAsRead, remove, clearAll, addNotification],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
});

export default memo(NotificationProvider);
