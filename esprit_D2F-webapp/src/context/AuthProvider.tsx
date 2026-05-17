import { useState, useMemo, useEffect, useContext, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthUser, AuthContextValue } from "../models/auth";
import { refreshToken as refreshTokenApi, logout as logoutApi } from "../services/authService";

interface AuthProviderProps {
  children: ReactNode;
}

/** Silent refresh interval: 100 minutes (JWT lasts 120 min) */
const REFRESH_INTERVAL_MS = 100 * 60 * 1000;

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Try to restore session from sessionStorage (survives page refresh,
    // cleared on tab close — safer than localStorage)
    const storedUser = sessionStorage.getItem("d2f_user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as AuthUser;
      } catch {
        sessionStorage.removeItem("d2f_user");
      }
    }
    return null;
  });

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Silent token refresh ──
  const startSilentRefresh = useCallback(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(async () => {
      try {
        const data = await refreshTokenApi();
        const updatedUser: AuthUser = {
          userId: data.userId,
          username: data.username,
          role: data.role,
          email: data.email,
          expiresIn: data.expiresIn,
        };
        setUser(updatedUser);
        try {
          sessionStorage.setItem("d2f_user", JSON.stringify(updatedUser));
        } catch {
          // ignore storage errors
        }
        console.debug("[AuthProvider] Token refreshed silently");
      } catch {
        console.warn("[AuthProvider] Silent refresh failed — session expired");
        stopSilentRefresh();
        setUser(null);
        sessionStorage.removeItem("d2f_user");
        try {
          window.dispatchEvent(new Event("auth:loggedOut"));
        } catch {
          /* ignore */
        }
      }
    }, REFRESH_INTERVAL_MS);
  }, []);

  const stopSilentRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Start silent refresh if user is logged in on mount
  useEffect(() => {
    if (user) {
      startSilentRefresh();
    }
    return () => stopSilentRefresh();
  }, [user, startSilentRefresh, stopSilentRefresh]);

  // Try to restore session via /refresh on initial load if user was stored
  useEffect(() => {
    if (user) {
      // Validate the cookie is still valid by doing a silent refresh
      refreshTokenApi()
        .then((data) => {
          const updatedUser: AuthUser = {
            userId: data.userId,
            username: data.username,
            role: data.role,
            email: data.email,
            expiresIn: data.expiresIn,
          };
          setUser(updatedUser);
          try {
            sessionStorage.setItem("d2f_user", JSON.stringify(updatedUser));
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // Cookie expired or invalid — clear session
          setUser(null);
          sessionStorage.removeItem("d2f_user");
        });
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for global logout events (emitted by http client on 401)
  useEffect(() => {
    const onAuthLoggedOut = () => {
      stopSilentRefresh();
      sessionStorage.removeItem("d2f_user");
      try {
        flushSync(() => setUser(null));
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("auth:loggedOut", onAuthLoggedOut);
    return () => window.removeEventListener("auth:loggedOut", onAuthLoggedOut);
  }, [stopSilentRefresh]);

  /**
   * Login — called after the POST /login response.
   * JWT is already in HttpOnly cookie; we only store metadata in React state.
   */
  const login = useCallback((userData: AuthUser) => {
    console.debug("[AuthProvider] login", { userData });
    try {
      sessionStorage.setItem("d2f_user", JSON.stringify(userData));
    } catch {
      // ignore storage errors
    }
    try {
      flushSync(() => setUser(userData));
    } catch {
      setUser(userData);
    }
    startSilentRefresh();
  }, [startSilentRefresh]);

  /**
   * Logout — clear cookie via API, clear React state.
   */
  const logout = useCallback(async () => {
    console.debug("[AuthProvider] logout");
    stopSilentRefresh();
    try {
      await logoutApi();
    } catch {
      // Server may be unreachable — still clear local state
    }
    sessionStorage.removeItem("d2f_user");
    try {
      flushSync(() => setUser(null));
    } catch {
      setUser(null);
    }
  }, [stopSilentRefresh]);

  const authValue = useMemo<AuthContextValue>(
    () => ({ user, login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use AuthContext
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
