/**
 * notificationSocket.ts — Couche de transport temps réel pour les notifications.
 *
 * Stratégie :
 *  - Si `url` est fournie, ouvre une vraie connexion `WebSocket` vers le backend
 *    (le serveur pousse des `NotificationSocketMessage` en JSON).
 *  - Sinon, bascule sur un `MockNotificationSocket` qui ÉMULE un flux temps réel
 *    (notifications réalistes D2F à intervalles aléatoires). Cela rend le centre
 *    de notifications pleinement fonctionnel sans backend dédié.
 *
 * Les deux implémentations respectent la même interface `NotificationTransport`,
 * ce qui permet de brancher un vrai serveur sans toucher au contexte React.
 */
import { v4 as uuidv4 } from "uuid";
import type {
  ConnectionStatus,
  NotificationSocketMessage,
} from "@/models/notification";

export interface TransportHandlers {
  onMessage: (msg: NotificationSocketMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
  onError?: (error: unknown) => void;
}

export interface NotificationTransport {
  connect(): void;
  close(): void;
}

const MAX_BACKOFF_MS = 15_000;

/** Transport réel basé sur l'API navigateur WebSocket. */
class WebSocketTransport implements NotificationTransport {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 1_000;
  private closedByUser = false;

  constructor(
    private readonly url: string,
    private readonly handlers: TransportHandlers,
  ) {}

  connect(): void {
    this.closedByUser = false;
    this.handlers.onStatus("connecting");
    try {
      this.socket = new WebSocket(this.url);
    } catch (err) {
      this.handlers.onError?.(err);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.backoff = 1_000;
      this.handlers.onStatus("open");
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as NotificationSocketMessage;
        this.handlers.onMessage(data);
      } catch {
        /* message non-JSON ignoré */
      }
    };

    this.socket.onerror = (err) => {
      this.handlers.onError?.(err);
    };

    this.socket.onclose = () => {
      if (!this.closedByUser) {
        this.handlers.onStatus("closed");
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.closedByUser) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }
}

/** Catalogue de notifications réalistes pour la démo temps réel. */
const MOCK_POOL: NotificationSocketMessage[] = [
  {
    type: "FORMATION", severity: "info", title: "Nouvelle formation planifiée",
    message: "« Intelligence Artificielle appliquée » – 12 oct. 2026, Bloc C.",
    link: "/home/Formation/Consulter", actor: "CUP",
  },
  {
    type: "EVALUATION", severity: "warning", title: "Évaluation à compléter",
    message: "Votre évaluation de la formation « Cybersécurité » expire dans 48 h.",
    link: "/home/Evaluations", actor: "Système",
  },
  {
    type: "CERTIFICAT", severity: "success", title: "Certificat disponible",
    message: "Votre certificat « Cloud & DevOps » est prêt au téléchargement.",
    link: "/home/certificate/MyCertificate", actor: "Système",
  },
  {
    type: "BESOIN", severity: "info", title: "Besoin validé",
    message: "Votre besoin en formation « Python avancé » a été validé par votre chef de département.",
    link: "/home/besoins", actor: "Chef Département",
  },
  {
    type: "COMPETENCE", severity: "success", title: "Compétence acquise",
    message: "La compétence « Gestion de projet agile » a été ajoutée à votre Skill Passport.",
    link: "/home/skill-passport", actor: "Système",
  },
  {
    type: "MESSAGE", severity: "info", title: "Nouveau message",
    message: "L'animateur de la formation « Data Science » vous a envoyé un message.",
    link: "/home/Formation", actor: "Animateur",
  },
  {
    type: "SYSTEM", severity: "warning", title: "Maintenance planifiée",
    message: "La plateforme sera indisponible le dimanche 18 oct. de 02:00 à 04:00.",
    actor: "Système",
  },
];

/** Transport de démonstration : émule un flux temps réel sans backend. */
class MockNotificationTransport implements NotificationTransport {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(private readonly handlers: TransportHandlers) {}

  connect(): void {
    this.closed = false;
    this.handlers.onStatus("mock");
    const tick = () => {
      if (this.closed) return;
      const template = MOCK_POOL[Math.floor(Math.random() * MOCK_POOL.length)];
      this.handlers.onMessage({
        ...template,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      });
      const next = 12_000 + Math.random() * 13_000; // 12–25 s
      this.timer = setTimeout(tick, next);
    };
    // Première notification rapide pour montrer le temps réel.
    this.timer = setTimeout(tick, 3_500);
  }

  close(): void {
    this.closed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Transport « REST » (pas de WebSocket) : se contente de signaler l'état.
 * Les données réelles sont poussées par le NotificationContext via
 * `fetchRealNotifications` (pas de messages simulés).
 */
class RestNotificationTransport implements NotificationTransport {
  constructor(private readonly handlers: TransportHandlers) {}
  connect(): void {
    this.handlers.onStatus("open");
  }
  close(): void {
    /* rien à fermer */
  }
}

/** Fabrique le transport adapté.
 *  - URL WebSocket fournie → transport temps réel.
 *  - Mode démo explicitement activé (VITE_NOTIFICATIONS_DEMO=true) → mock.
 *  - Sinon → transport REST (données réelles récupérées par le contexte). */
export function createNotificationTransport(
  url: string | undefined,
  handlers: TransportHandlers,
): NotificationTransport {
  if (url && url.trim().length > 0) {
    return new WebSocketTransport(url, handlers);
  }
  if (import.meta.env.VITE_NOTIFICATIONS_DEMO === "true") {
    return new MockNotificationTransport(handlers);
  }
  return new RestNotificationTransport(handlers);
}
