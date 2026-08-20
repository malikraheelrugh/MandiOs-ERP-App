import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function getStoredToken() {
  try {
    const saved = localStorage.getItem('mandi_token');
    if (!saved || saved === 'null' || saved === 'undefined' || saved.trim() === '') {
      return null;
    }
    return saved.trim();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('mandi_token');
      localStorage.removeItem('mandi_login_time');
    } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const isSessionExpired = useCallback(() => {
    try {
      const loginTime = localStorage.getItem('mandi_login_time');
      if (!loginTime) return false;
      const elapsed = Date.now() - Number(loginTime);
      return elapsed >= TWENTY_FOUR_HOURS_MS;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const currentToken = getStoredToken();
      if (!currentToken) {
        logout();
        setLoading(false);
        return;
      }

      if (isSessionExpired()) {
        logout();
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/profile');
        if (res.data) {
          setUser(res.data);
        } else {
          logout();
        }
      } catch (err) {
        // Silently clear session if token is expired, invalid, or unauthorized
        logout();
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [token, isSessionExpired, logout]);

  // Periodic check to auto-expire session when 24 hours elapse
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      if (isSessionExpired()) {
        logout();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [token, isSessionExpired, logout]);

  const login = async (identifier, password, role) => {
    try {
      const res = await api.post('/auth/login', { identifier, email: identifier, password, role });
      const { token: receivedToken, user: receivedUser } = res.data;

      if (!receivedToken) {
        return { success: false, error: 'Authentication failed. No token received.' };
      }

      const now = Date.now();
      localStorage.setItem('mandi_token', receivedToken);
      localStorage.setItem('mandi_login_time', now.toString());
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Authentication failed. Please check credentials.';
      return { success: false, error: errMsg };
    }
  };

  const refreshProfile = async () => {
    const currentToken = getStoredToken();
    if (!currentToken || isSessionExpired()) return;
    try {
      const res = await api.get('/auth/profile');
      if (res.data) {
        setUser(res.data);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

