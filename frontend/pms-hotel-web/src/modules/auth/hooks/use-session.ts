"use client";

import { useState, useCallback, useEffect } from "react";
import { setAuthToken, onUnauthorized } from "@/lib/http";
import type { UserSession, LoginCredentials } from "../model/session";

export interface UseSessionResult {
  session: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<UserSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<UserSession | null>;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        setSession(null);
        setAuthToken(null);
        return null;
      }
      const data = (await res.json()) as { session: UserSession | null };
      if (data.session) {
        setSession(data.session);
        setAuthToken(data.session.token);
        return data.session;
      }
      setSession(null);
      setAuthToken(null);
      return null;
    } catch {
      setSession(null);
      setAuthToken(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<UserSession> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al iniciar sesión");
      }

      const data = (await res.json()) as { session: UserSession };
      setSession(data.session);
      setAuthToken(data.session.token);
      return data.session;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setSession(null);
      setAuthToken(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const cleanup = onUnauthorized(() => {
      if (isMounted) {
        setSession(null);
        setAuthToken(null);
      }
    });

    const loadInitialSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!isMounted) return;
        if (!res.ok) {
          setSession(null);
          setAuthToken(null);
          return;
        }
        const data = (await res.json()) as { session: UserSession | null };
        if (!isMounted) return;
        if (data.session) {
          setSession(data.session);
          setAuthToken(data.session.token);
        } else {
          setSession(null);
          setAuthToken(null);
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setAuthToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialSession();

    return () => {
      isMounted = false;
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, []);

  return {
    session,
    isLoading,
    isAuthenticated: Boolean(session),
    login,
    logout,
    refreshSession,
  };
}
