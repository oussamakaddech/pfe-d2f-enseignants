import { useState, useMemo, useEffect } from "react";
import { flushSync } from "react-dom";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthUser, AuthContextValue } from "../models/auth";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        return JSON.parse(storedUser) as AuthUser;
      } catch {
        localStorage.removeItem("user");
      }
    }
    return null;
  });

  // Parse JWT payload without third-party helpers to avoid runtime import issues
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

  // If a token exists but no `user` is stored in localStorage (or in state),
  // try to hydrate `user` from the token payload so PrivateRoute won't redirect.
  useEffect(() => {
    if (user) return;
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    if (token && !storedUser) {
      console.debug("[AuthProvider] hydrating user from token");
      const payload = parseJwt(token);
      if (payload) {
        const username = (payload["username"] ?? payload["sub"] ?? payload["userName"] ?? "") as string;
        const role = (payload["role"] ?? "") as string;
        const userData: AuthUser = { username, role };
        try {
          localStorage.setItem("user", JSON.stringify(userData));
        } catch {
          // ignore storage errors
        }
        setUser(userData);
      }
    }
  }, [user]);

  // Listen for global logout events (emitted by http client on 401) so that
  // React state is synchronized when the interceptor clears localStorage.
  useEffect(() => {
    const onAuthLoggedOut = () => {
      try {
        flushSync(() => setUser(null));
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("auth:loggedOut", onAuthLoggedOut);
    return () => window.removeEventListener("auth:loggedOut", onAuthLoggedOut);
  }, []);

  const login = (token: string, userData: AuthUser) => {
    console.debug("[AuthProvider] login", { userData });
    localStorage.setItem("authToken", token);
    try {
      localStorage.setItem("user", JSON.stringify(userData));
    } catch {
      // ignore storage errors
    }
    try {
      flushSync(() => setUser(userData));
    } catch {
      // fallback if flushSync is not available in the environment
      setUser(userData);
    }
  };

  const logout = () => {
    console.debug("[AuthProvider] logout");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    try {
      flushSync(() => setUser(null));
    } catch {
      setUser(null);
    }
  };

  const authValue = useMemo<AuthContextValue>(
    () => ({ user, login, logout }),
    [user]
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
