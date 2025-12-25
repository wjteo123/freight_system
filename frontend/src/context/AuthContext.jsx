import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("freight_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("freight_user");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (_err) {
      return null;
    }
  });

  const login = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("freight_token", nextToken);
    localStorage.setItem("freight_user", JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(({ skipRemote = false } = {}) => {
    const hasToken = Boolean(localStorage.getItem("freight_token"));
    if (!skipRemote && hasToken) {
      authApi.logout().catch((_error) => {
        // Ignore network or auth errors during logout; local cleanup still runs.
      });
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem("freight_token");
    localStorage.removeItem("freight_user");
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => logout({ skipRemote: true });
    window.addEventListener("freight:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("freight:unauthorized", handleUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: Boolean(token)
    }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
