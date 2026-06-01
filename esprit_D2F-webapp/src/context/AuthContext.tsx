import { useState, useMemo, useEffect, useCallback, useRef, createContext, memo } from "react";
import { flushSync } from "react-dom";
import type { ReactNode } from "react";
import type { AuthUser, AuthContextValue, UserRole } from "@/models/auth";
import { refreshToken as refreshTokenApi, logout as logoutApi } from "@/services/auth/AuthService";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/** Silent refresh interval: 100 minutes (JWT lasts 120 min) */
const REFRESH_INTERVAL_MS = 100 * 60 * 1000;

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
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
  const authGenerationRef = useRef(0);
  const renderGeneration = authGenerationRef.current;

  const stopSilentRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const doRefresh = useCallback(() => {
    const generation = authGenerationRef.current;
    refreshTokenApi()
      .then((data) => {
        if (generation !== authGenerationRef.current) {
          return;
        }
        const updatedUser: AuthUser = {
          userId: data.userId,
          username: data.username,
          role: data.role as UserRole,
          email: data.email,
          expiresIn: data.expiresIn,
        };
        setUser(updatedUser);
        try {
          sessionStorage.setItem("d2f_user", JSON.stringify(updatedUser));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        if (generation !== authGenerationRef.current) {
          return;
        }
        stopSilentRefresh();
        setUser(null);
        sessionStorage.removeItem("d2f_user");
        try {
          globalThis.dispatchEvent(new Event("auth:loggedOut"));
        } catch {
          /* ignore */
        }
      });
  }, [stopSilentRefresh]);

  const startSilentRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    doRefresh();
    refreshTimerRef.current = setInterval(() => {
      doRefresh();
    }, REFRESH_INTERVAL_MS);
  }, [doRefresh]);

  useEffect(() => {
    if (user && renderGeneration === authGenerationRef.current) {
      startSilentRefresh();
    }
    return () => stopSilentRefresh();
  }, [user, renderGeneration, startSilentRefresh, stopSilentRefresh]);

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
    globalThis.addEventListener("auth:loggedOut", onAuthLoggedOut);
    return () => globalThis.removeEventListener("auth:loggedOut", onAuthLoggedOut);
  }, [stopSilentRefresh]);

  const login = useCallback((userData: AuthUser) => {
    authGenerationRef.current += 1;
    try {
      sessionStorage.setItem("d2f_user", JSON.stringify(userData));
    } catch {
      /* ignore */
    }
    try {
      flushSync(() => setUser(userData));
    } catch {
      setUser(userData);
    }
    startSilentRefresh();
  }, [startSilentRefresh]);

  const logout = useCallback(() => {
    authGenerationRef.current += 1;
    stopSilentRefresh();
    sessionStorage.removeItem("d2f_user");
    try {
      flushSync(() => setUser(null));
    } catch {
      setUser(null);
    }
    logoutApi().catch(() => { /* ignore */ });
  }, [stopSilentRefresh]);

  const authValue = useMemo<AuthContextValue>(
    () => ({ user, login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

export default memo(AuthProvider);
