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
import { navigate } from "./navigation";
import { config } from "../config/env";
import { notify } from "./notifications";

export function createApiClient(baseURL?: string) {
  const api = axios.create({
    baseURL,
    withCredentials: true, // Send HttpOnly cookies with every request
  });

  // Expose a small helper on the created instance so code that imports the
  // client as `axios` can still call `axios.isAxiosError(...)` safely.
  (api as any).isAxiosError = (error: unknown) => {
    try {
      return axiosIsAxiosError ? axiosIsAxiosError(error as any) : (error as any)?.isAxiosError === true;
    } catch {
      return (error as any)?.isAxiosError === true;
    }
  };

  // No request interceptor needed — HttpOnly cookie is sent automatically

  api.interceptors.response.use(
    (response) => response,
    (error) => {
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
          window.dispatchEvent(new Event("auth:loggedOut"));
        } catch {
          /* ignore */
        }
        const isAlreadyOnLogin =
          window.location.pathname === "/" ||
          window.location.pathname.startsWith("/login") ||
          window.location.pathname.startsWith("/auth");
        if (!isAlreadyOnLogin) {
          navigate("/", { replace: true });
        }
      } else if (error?.config?.meta?.silent !== true) {
        // Global UX feedback for unexpected errors. Callers can opt out by
        // passing { meta: { silent: true } } when they handle the error themselves.
        const serverMsg = error?.response?.data?.message;

        if (!error?.response) {
          notify.error("Pas de connexion au serveur. Vérifiez votre réseau.");
        } else if (status >= 500) {
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

export const defaultApi = createApiClient();
