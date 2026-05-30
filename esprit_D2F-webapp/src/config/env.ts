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
}

const stripTrailingSlash = (v: string): string => v.replace(/\/$/, "");

const readApiBase = (): string => {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== "string") {
    if (import.meta.env.MODE === "production") {
      throw new Error("VITE_API_URL is required in production");
    }
    return "";
  }
  return stripTrailingSlash(raw);
};

const API_BASE_URL = readApiBase();
const FORMATION_SERVICE_URL = import.meta.env.VITE_FORMATION_SERVICE_URL
  ? stripTrailingSlash(import.meta.env.VITE_FORMATION_SERVICE_URL)
  : API_BASE_URL;
const RICE_URL = import.meta.env.VITE_RICE_URL
  ? stripTrailingSlash(import.meta.env.VITE_RICE_URL)
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
};
