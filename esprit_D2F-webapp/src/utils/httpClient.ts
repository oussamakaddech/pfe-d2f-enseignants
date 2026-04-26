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
    if (!token) return config;
    try {
      const payload = parseJwt(token);
      const currentTime = Date.now() / 1000;
      if (payload && typeof (payload as any).exp === "number" && (payload as any).exp < currentTime) {
        localStorage.removeItem("authToken");
        return Promise.reject(new Error("Token expired"));
      }
    } catch {
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

      const urlStr = String(url || "");
      const isFormationApi =
        (config?.FORMATION_URL && urlStr.includes(config.FORMATION_URL)) || urlStr.includes("/formation/");

      if (status === 401) {
        if (isFormationApi) {
          return Promise.reject(error);
        }

        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
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
