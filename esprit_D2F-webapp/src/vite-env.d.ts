/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FORMATION_SERVICE_URL?: string;
  readonly VITE_RICE_URL?: string;
  readonly VITE_NOTIFICATION_URL?: string;
  readonly VITE_NOTIFICATIONS_WS_URL?: string;
  readonly VITE_NOTIFICATIONS_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
