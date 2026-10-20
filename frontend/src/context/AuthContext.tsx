import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi } from '../services/authApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authServiceOnline: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, password?: string) => Promise<boolean>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  checkHealth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'centavo_auth_token';
const USER_KEY = 'centavo_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authServiceOnline, setAuthServiceOnline] = useState<boolean>(false);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    const isOnline = await authApi.health();
    setAuthServiceOnline(isOnline);
    return isOnline;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const isOnline = await checkHealth();

      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedToken && isOnline) {
        const verification = await authApi.verify(savedToken);
        if (verification.valid && verification.user) {
          setToken(savedToken);
          setUser(verification.user);
        } else if (savedUser) {
          // Fallback if verification endpoint had issues or demo session
          try {
            setUser(JSON.parse(savedUser));
            setToken(savedToken);
          } catch {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }
      } else if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setToken(savedToken || 'demo_token');
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [checkHealth]);

  const login = async (email: string, password = ''): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Check if service is up
      const isOnline = await checkHealth();
      if (isOnline && password) {
        const response = await authApi.login(email, password);
        const jwt = response.accessToken || response.session?.token || response.token || 'session_token';
        setUser(response.user);
        setToken(jwt);
        localStorage.setItem(TOKEN_KEY, jwt);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        return true;
      }

      // Local / Offline demo simulation fallback
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockUser: User = {
        id: 'usr_demo_' + Date.now(),
        name: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Usuario Centavo',
        email: email,
      };
      setUser(mockUser);
      setToken('demo_token');
      localStorage.setItem(TOKEN_KEY, 'demo_token');
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password = ''): Promise<boolean> => {
    setIsLoading(true);
    try {
      const isOnline = await checkHealth();
      if (isOnline && password) {
        const response = await authApi.register(name, email, password);
        const jwt = response.accessToken || response.session?.token || response.token || 'session_token';
        setUser(response.user);
        setToken(jwt);
        localStorage.setItem(TOKEN_KEY, jwt);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        return true;
      }

      // Offline fallback
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockUser: User = {
        id: 'usr_new_' + Date.now(),
        name,
        email,
      };
      setUser(mockUser);
      setToken('demo_token');
      localStorage.setItem(TOKEN_KEY, 'demo_token');
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async (): Promise<void> => {
    try {
      await login('demo@centavo.app', 'Centavo2026!');
    } catch {
      await register('Usuario Demo', 'demo@centavo.app', 'Centavo2026!');
    }
  };

  const logout = async () => {
    if (token && token !== 'demo_token') {
      await authApi.logout(token);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        authServiceOnline,
        login,
        register,
        loginAsDemo,
        logout,
        checkHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
