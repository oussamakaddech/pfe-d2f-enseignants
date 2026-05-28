/**
 * httpClient.ts — Central axios client
 * - Factory `createApiClient(baseURL?)` that attaches:
 *   - withCredentials: true — sends HttpOnly cookies automatically
 *   - response interceptor: dispatches auth:loggedOut on 401 and redirects to login
 *
 * SECURITY: JWT is stored in HttpOnly cookie (not localStorage).
 * The browser sends the cookie automatically with `withCredentials: true`.
 */
import axios, { isAxiosError as axiosIsAxiosError } from "axios";
import type { AxiosResponse, AxiosError } from "axios";
import { navigate } from "./navigation";
import { config } from "../../config/env";
import { notify } from "./notifications";

const NETWORK_ERROR_TOAST_COOLDOWN_MS = 10_000;
let lastNetworkErrorToastAt = 0;

function shouldShowNetworkErrorToast(): boolean {
  const now = Date.now();
  if (now - lastNetworkErrorToastAt < NETWORK_ERROR_TOAST_COOLDOWN_MS) {
    return false;
  }
  lastNetworkErrorToastAt = now;
  return true;
}

export function createApiClient(baseURL?: string) {
  const api = axios.create({
    baseURL,
    withCredentials: true, // Send HttpOnly cookies with every request
  });

  // Expose a small helper on the created instance so code that imports the
  // client as `axios` can still call `axios.isAxiosError(...)` safely.
  (api as unknown as Record<string, unknown>).isAxiosError = (error: unknown) => {
    try {
      return axiosIsAxiosError ? axiosIsAxiosError(error as Record<string, unknown>) : (error as Record<string, unknown>)?.isAxiosError === true;
    } catch {
      return (error as Record<string, unknown>)?.isAxiosError === true;
    }
  };

  // No request interceptor needed — HttpOnly cookie is sent automatically

  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      const status = error?.response?.status;
      const url = error?.config?.url;

      const urlStr = String(url || "");
      const isFormationApi =
        (config?.FORMATION_URL && urlStr.includes(config.FORMATION_URL)) || urlStr.includes("/formation/");

      if (status === 401) {
        if (isFormationApi) {
          return Promise.reject(error);
        }

        try {
          globalThis.dispatchEvent(new Event("auth:loggedOut"));
        } catch {
          /* ignore */
        }
        const isAlreadyOnLogin =
          globalThis.location.pathname === "/" ||
          globalThis.location.pathname.startsWith("/login") ||
          globalThis.location.pathname.startsWith("/auth");
        if (!isAlreadyOnLogin) {
          navigate("/", { replace: true });
        }
      } else if ((error?.config as { meta?: { silent?: boolean } })?.meta?.silent !== true) {
        // Global UX feedback for unexpected errors. Callers can opt out by
        // passing { meta: { silent: true } } when they handle the error themselves.
        const serverMsg = (error?.response?.data as { message?: string })?.message;

        if (!error?.response) {
          if (shouldShowNetworkErrorToast()) {
            notify.error("Pas de connexion au serveur. Vérifiez votre réseau.");
          }
        } else if (status && status >= 500) {
          notify.error(serverMsg || "Erreur serveur. Réessayez dans un instant.");
        } else if (status === 403) {
          notify.warning(serverMsg || "Accès refusé.");
        } else if (status === 422) {
          notify.warning(serverMsg || "Données invalides ou insuffisantes.");
        }
        // 400/404/409 etc. are left to the caller for context-specific handling.
      }
      return Promise.reject(error);
    }
  );

  return api;
}

export const defaultApi = createApiClient(config.API_BASE_URL);




