/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FORMATION_SERVICE_URL?: string;
  readonly VITE_RICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
