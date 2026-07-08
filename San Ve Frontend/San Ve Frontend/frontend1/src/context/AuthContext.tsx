/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// FIX TS2339: export User interface với avatarUrl để ProfilePage import được
export interface User {
  id: number;
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
  // FIX [H-03]: export loading state để PrivateRoute và AdminRouteGuard
  // đợi verify xong mới quyết định redirect — tránh logout nhầm sau page refresh
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('accessToken')
  );
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      // Xóa dữ liệu corrupt để tránh crash lần sau
      localStorage.removeItem('user');
      return null;
    }
  });
  // FIX [H-03]: loading = true trong lúc khởi tạo initial state từ localStorage
  // Sử dụng false vì giá trị được khởi tạo đồng bộ từ localStorage ngay trong useState()
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Đảm bảo loading = false sau khi hydrate xong (trường hợp SSR hoặc lazy init)
    setLoading(false);
  }, []);

  useEffect(() => {
    const handler = () => {
      const nextToken = localStorage.getItem('accessToken');
      const nextUserRaw = localStorage.getItem('user');
      setToken(nextToken);
      if (!nextUserRaw) {
        setUser(null);
        return;
      }
      try {
        setUser(JSON.parse(nextUserRaw) as User);
      } catch {
        localStorage.removeItem('user');
        setUser(null);
      }
    };
    window.addEventListener('auth-changed', handler);
    return () => window.removeEventListener('auth-changed', handler);
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('accessToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    window.dispatchEvent(new Event('auth-changed'));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('auth-changed'));
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
