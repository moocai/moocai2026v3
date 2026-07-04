import { createContext, use, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';

interface User {
  id: number;
  name: string;
  email: string;
  code?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email: string; code: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentStudent');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
          setToken(savedToken);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('currentStudent');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (credentials: { email: string; code: string }) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    setToken(data.token);
    window.dispatchEvent(new Event('auth-state-change'));
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
    window.dispatchEvent(new Event('auth-state-change'));
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}