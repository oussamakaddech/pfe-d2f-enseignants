interface AppConfig {
  FORMATION_URL: string;
  URL_ACCOUNT: string;
  AI_URL: string;
  Besoin_URL: string;
  CERTF_URL: string;
  EVALUATION_URL: string;
  COMPETENCE_URL: string;
  GATEWAY_URL: string;
  RICE_URL: string;
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || import.meta.env.VITE_MAP || ""
).replace(/\/$/, "");

export const config: AppConfig = {
  FORMATION_URL: API_BASE_URL,
  URL_ACCOUNT: API_BASE_URL,
  AI_URL: API_BASE_URL,
  Besoin_URL: API_BASE_URL,
  CERTF_URL: API_BASE_URL,
  EVALUATION_URL: API_BASE_URL,
  COMPETENCE_URL: API_BASE_URL,
  GATEWAY_URL: API_BASE_URL,
  RICE_URL: import.meta.env.VITE_RICE_URL || "",
};
