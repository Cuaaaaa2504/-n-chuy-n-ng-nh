/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearMovieRatingCache } from '../api/movieRatingApi';
import authApi from '../api/authApi';

export interface User {
  id: number;
  userId?: number;
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

function readAuthStorage(key: string): string | null {
  const sessionValue = sessionStorage.getItem(key);
  if (sessionValue) return sessionValue;

  const legacyValue = localStorage.getItem(key);
  if (legacyValue) {
    sessionStorage.setItem(key, legacyValue);
    localStorage.removeItem(key);
  }
  return legacyValue;
}

function writeAuthStorage(key: string, value: string): void {
  sessionStorage.setItem(key, value);
  localStorage.removeItem(key);
}

function clearAuthStorage(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function normalizeUser(
  raw: User | (Omit<User, 'id'> & { id?: number; userId?: number }),
): User {
  const resolvedId = Number(raw.id ?? raw.userId);
  return {
    ...raw,
    id: Number.isFinite(resolvedId) ? resolvedId : 0,
    userId: Number.isFinite(resolvedId) ? resolvedId : raw.userId,
  } as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    readAuthStorage(ACCESS_TOKEN_KEY)
  );
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = readAuthStorage(USER_KEY);
      return saved ? normalizeUser(JSON.parse(saved) as User) : null;
    } catch {
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = () => {
      clearMovieRatingCache();
      setLoading(true);
      try {
        const nextToken = readAuthStorage(ACCESS_TOKEN_KEY);
        const nextUserRaw = readAuthStorage(USER_KEY);
        setToken(nextToken);
        if (!nextUserRaw) {
          setUser(null);
          return;
        }
        try {
          setUser(normalizeUser(JSON.parse(nextUserRaw) as User));
        } catch {
          sessionStorage.removeItem(USER_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener('auth-changed', handler);
    return () => window.removeEventListener('auth-changed', handler);
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    clearMovieRatingCache();
    const normalizedUser = normalizeUser(newUser);
    writeAuthStorage(ACCESS_TOKEN_KEY, newToken);
    writeAuthStorage(USER_KEY, JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
    window.dispatchEvent(new Event('auth-changed'));
  }, []);

  const logout = useCallback(() => {
    clearMovieRatingCache();
    clearAuthStorage();
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('auth-changed'));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      const currentToken = readAuthStorage(ACCESS_TOKEN_KEY);

      if (!currentToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const serverUser = await authApi.getMe();
        if (cancelled) return;

        const normalizedUser = normalizeUser(serverUser as User);
        writeAuthStorage(USER_KEY, JSON.stringify(normalizedUser));
        setToken(currentToken);
        setUser(normalizedUser);
      } catch {
        if (cancelled) return;
        clearAuthStorage();
        setToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void verifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoggedIn: !!token, loading, login, logout }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
