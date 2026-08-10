/**
 * Centralized frontend configuration (DSI §3.5).
 * Single source of truth for backend URLs — never hardcode URLs elsewhere.
 */

interface AppConfig {
  API_BASE_URL: string;
  FORMATION_URL: string;
  FORMATION_SERVICE_URL: string;
  URL_ACCOUNT: string;
  AI_URL: string;
  BESOIN_URL: string;
  CERTF_URL: string;
  EVALUATION_URL: string;
  COMPETENCE_URL: string;
  GATEWAY_URL: string;
  RICE_URL: string;
  ANALYSE_URL: string;
  /** Base URL REST du service de notifications (via gateway : /api/notifications). */
  NOTIFICATION_URL: string;
  /** Endpoint WebSocket du serveur de notifications. Vide => mode REST (pas de push). */
  NOTIFICATIONS_WS_URL: string;
}

const stripTrailingSlash = (v: string): string => v.replace(/\/$/, '');

const readApiBase = (): string => {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string') {
    if (import.meta.env.MODE === 'production') {
      throw new Error('VITE_API_URL is required in production');
    }
    return '';
  }
  let url = stripTrailingSlash(raw);
  // Ensure relative URLs always start with "/" so they resolve correctly
  // against the page origin and don't accidentally concatenate with baseURL.
  if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = `/${url}`;
  }
  return url;
};

const API_BASE_URL = readApiBase();
const FORMATION_SERVICE_URL = import.meta.env.VITE_FORMATION_SERVICE_URL
  ? stripTrailingSlash(import.meta.env.VITE_FORMATION_SERVICE_URL)
  : API_BASE_URL;
const RICE_URL = import.meta.env.VITE_RICE_URL
  ? stripTrailingSlash(import.meta.env.VITE_RICE_URL)
  : API_BASE_URL;

const NOTIFICATIONS_WS_URL = import.meta.env.VITE_NOTIFICATIONS_WS_URL
  ? String(import.meta.env.VITE_NOTIFICATIONS_WS_URL)
  : '';

const NOTIFICATION_URL = import.meta.env.VITE_NOTIFICATION_URL
  ? stripTrailingSlash(import.meta.env.VITE_NOTIFICATION_URL)
  : API_BASE_URL;

export const config: AppConfig = {
  API_BASE_URL,
  FORMATION_URL: API_BASE_URL,
  FORMATION_SERVICE_URL,
  URL_ACCOUNT: API_BASE_URL,
  AI_URL: API_BASE_URL,
  BESOIN_URL: API_BASE_URL,
  CERTF_URL: API_BASE_URL,
  EVALUATION_URL: API_BASE_URL,
  COMPETENCE_URL: API_BASE_URL,
  GATEWAY_URL: API_BASE_URL,
  RICE_URL,
  ANALYSE_URL: API_BASE_URL,
  NOTIFICATION_URL,
  NOTIFICATIONS_WS_URL,
};
