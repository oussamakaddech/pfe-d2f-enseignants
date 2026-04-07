/**
 * httpClient.ts — Central axios client
 * - Factory `createApiClient(baseURL?)` that attaches:
 *   - request interceptor: injects `Authorization: Bearer <token>` and checks expiry
 *   - response interceptor: clears token on 401 and redirects to login
 */
import axios, { isAxiosError as axiosIsAxiosError, type InternalAxiosRequestConfig } from "axios";
import { navigate } from "./navigation";
import { config } from "../config/env";

const parseJwt = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export function createApiClient(baseURL?: string) {
  const api = axios.create({ baseURL });

  // Expose a small helper on the created instance so code that imports the
  // client as `axios` can still call `axios.isAxiosError(...)` safely.
  // This bridges code that incorrectly treated the created instance as the
  // axios module and prevents runtime `isAxiosError is not a function` errors.
  (api as any).isAxiosError = (error: unknown) => {
    try {
      return axiosIsAxiosError ? axiosIsAxiosError(error as any) : (error as any)?.isAxiosError === true;
    } catch {
      return (error as any)?.isAxiosError === true;
    }
  };

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("authToken");
    // Debug: log whether a token will be attached (masked)
    try {
      const masked = token ? `${String(token).slice(0, 8)}...${String(token).slice(-8)}` : "(none)";
      const method = (config.method ?? "get").toUpperCase();
      console.debug("[httpClient] request", { method, url: config.url, token: masked });
      const payload = token ? parseJwt(token) : null;
      if (payload) {
        // only log non-sensitive payload fields for debugging
        console.debug("[httpClient] token payload", {
          username: (payload as any)["username"] ?? (payload as any)["sub"] ?? (payload as any)["userName"],
          exp: (payload as any).exp,
        });
      }
    } catch (e) {
      /* ignore logging errors */
    }
    if (!token) return config;
    try {
      const payload = parseJwt(token);
      const currentTime = Date.now() / 1000;
      if (payload && typeof (payload as any).exp === "number" && (payload as any).exp < currentTime) {
        console.debug("[httpClient] token expired, removing from storage");
        localStorage.removeItem("authToken");
        return Promise.reject(new Error("Token expired"));
      }
    } catch (e) {
      console.debug("[httpClient] jwt parse failed, removing token", e);
      localStorage.removeItem("authToken");
    }
    if (!config.headers) config.headers = {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url;

      // Detect whether the failing request targets the formation API.
      // If so, avoid performing a global logout (clearing token + navigation)
      // because some formation endpoints may reject tokens for service-level
      // reasons; forcing a full logout on first 401 prevents the user from
      // continuing to other pages. The callers should handle 401 per-route.
      const urlStr = String(url || "");
      const isFormationApi =
        (config?.FORMATION_URL && urlStr.includes(config.FORMATION_URL)) || urlStr.includes("/formation/");

      if (status === 401) {
        if (isFormationApi) {
          console.debug("[httpClient] 401 from formation API (skipping global logout)", url, error?.response?.data || error?.message);
          // Let the component handle the 401 (it will receive the rejected promise)
          return Promise.reject(error);
        }

        console.debug("[httpClient] 401 from", url, error?.response?.data || error?.message);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        // Let the rest of the app know we logged out due to an auth failure
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
      }
      return Promise.reject(error);
    }
  );

  return api;
}

export const defaultApi = createApiClient();
