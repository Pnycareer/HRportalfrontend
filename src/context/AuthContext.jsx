// src/context/AuthContext.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";

const AuthContext = React.createContext(null);

function normalizeUserPayload(payload) {
  if (!payload) return null;
  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  const activeRole =
    payload.activeRole ||
    payload.role ||
    (roles.length ? roles[0] : null);
  return {
    ...payload,
    roles,
    activeRole,
    role: activeRole,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/auth/me");
      setUser(normalizeUserPayload(res.data));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(
    async ({ email, password }) => {
      const { data } = await api.post("/api/auth/login", { email, password });
      const normalized = normalizeUserPayload(data);
      setUser(normalized);
      await checkAuth();
      return normalized;
    },
    [checkAuth]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const switchRole = useCallback(
    async (role) => {
      const { data } = await api.post("/api/auth/switch-role", { role });
      await checkAuth();
      return normalizeUserPayload({
        ...(user || {}),
        ...data,
      });
    },
    [checkAuth, user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      initializing,
      login,
      logout,
      checkAuth,
      switchRole,
      setUser,
    }),
    [user, loading, initializing, login, logout, checkAuth, switchRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
