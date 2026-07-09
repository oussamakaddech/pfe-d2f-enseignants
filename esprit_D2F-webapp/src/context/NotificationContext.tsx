/**
 * NotificationContext.tsx — État global du centre de notifications.
 *
 * Responsabilités :
 *  - Conserver la liste des notifications (persistée en sessionStorage par utilisateur).
 *  - Ouvrir le transport temps réel (WebSocket réel ou mock) et ingérer les messages.
 *  - Exposer les actions : marquer comme lu, tout marquer lu, supprimer, vider.
 *
 * Volontairement découplé de React Query (données serveur) : les notifications sont
 * un état applicatif « push » temps réel, géré via Context comme l'auth (cf. AuthContext).
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
import { fetchRealNotifications } from "@/services/notification/notificationService";
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
    read: false,
    createdAt: msg.createdAt ?? new Date().toISOString(),
    link: msg.link,
    actor: msg.actor,
    meta: msg.meta,
  };
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

  // Connexion au transport temps réel (WebSocket réel, REST, ou démo).
  useEffect(() => {
    const transport = createNotificationTransport(config.NOTIFICATIONS_WS_URL, {
      onMessage: (msg) => {
        setNotifications((draft) => {
          const notification = toNotification(msg);
          // Évite les doublons sur id.
          if (draft.some((n) => n.id === notification.id)) return;
          draft.unshift(notification);
          if (draft.length > MAX_NOTIFICATIONS) draft.length = MAX_NOTIFICATIONS;
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

  // Amorçage avec de vraies alertes du backend (données réelles, jamais simulées).
  useEffect(() => {
    let cancelled = false;
    fetchRealNotifications()
      .then((real) => {
        if (cancelled) return;
        if (real.length === 0) {
          // Pas de données réelles et pas de flux temps réel → hors ligne.
          if (!config.NOTIFICATIONS_WS_URL) setStatus("closed");
          return;
        }
        setNotifications((draft) => {
          const existing = new Set(draft.map((n) => n.id));
          real.forEach((n) => {
            if (!existing.has(n.id)) draft.unshift(n);
          });
          if (draft.length > MAX_NOTIFICATIONS) draft.length = MAX_NOTIFICATIONS;
        });
      })
      .catch(() => {
        if (!config.NOTIFICATIONS_WS_URL) setStatus("closed");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, setNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((draft) => {
      const target = draft.find((n) => n.id === id);
      if (target) target.read = true;
    });
  }, [setNotifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications((draft) => {
      draft.forEach((n) => { n.read = true; });
    });
  }, [setNotifications]);

  const remove = useCallback((id: string) => {
    setNotifications((draft) => {
      const idx = draft.findIndex((n) => n.id === id);
      if (idx !== -1) draft.splice(idx, 1);
    });
  }, [setNotifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, [setNotifications]);

  const addNotification = useCallback((payload: NotificationPayload) => {
    setNotifications((draft) => {
      const notification: AppNotification = {
        id: uuidv4(),
        read: false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        ...payload,
      };
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
