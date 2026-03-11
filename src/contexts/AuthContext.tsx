import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { User, UserRole, LoginRequest } from '../types/auth';
import {
  authApi,
  storeTokens,
  storeUser,
  getStoredUser,
  getStoredRefreshToken,
  clearAuthStorage,
  isTokenExpired,
} from '../services/authApi';

// ============================================
// Types
// ============================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  hasRole: (roles: UserRole[]) => boolean;
  isOwner: boolean;
  isManager: boolean;
}

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Provider
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const isRefreshing = useRef(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current) return false;

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;

    isRefreshing.current = true;
    try {
      const response = await authApi.refreshToken({ refresh_token: refreshToken });
      storeTokens(response.access_token, response.refresh_token, response.expires_at);
      return true;
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      clearAuthStorage();
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  const setupRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(async () => {
      if (isTokenExpired()) {
        const success = await refreshSession();
        if (!success) console.warn('[Auth] Session expired, logging out');
      }
    }, 10 * 60 * 1000);
  }, [refreshSession]);

  const checkAuth = useCallback(async () => {
    try {
      const storedUser = getStoredUser();
      if (!storedUser) {
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      if (isTokenExpired()) {
        const refreshed = await refreshSession();
        if (!refreshed) {
          setState({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
      }

      try {
        const freshUser = await authApi.getMe();
        storeUser(freshUser);
        setState({ user: freshUser, isAuthenticated: true, isLoading: false });
        setupRefreshInterval();
      } catch {
        const refreshed = await refreshSession();
        if (refreshed) {
          const freshUser = await authApi.getMe();
          storeUser(freshUser);
          setState({ user: freshUser, isAuthenticated: true, isLoading: false });
          setupRefreshInterval();
        } else {
          clearAuthStorage();
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    } catch {
      clearAuthStorage();
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, [refreshSession, setupRefreshInterval]);

  useEffect(() => {
    checkAuth();

    const handleSessionExpired = () => {
      clearAuthStorage();
      setState({ user: null, isAuthenticated: false, isLoading: false });
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [checkAuth]);

  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResult> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authApi.login(credentials);
      storeTokens(response.access_token, response.refresh_token, response.expires_at);
      storeUser(response.user);
      setState({ user: response.user, isAuthenticated: true, isLoading: false });
      setupRefreshInterval();
      return { success: true };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión. Intenta nuevamente.',
      };
    }
  }, [setupRefreshInterval]);

  const logout = useCallback(async () => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    try {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) await authApi.logout({ refresh_token: refreshToken });
    } catch {
      // Ignore
    } finally {
      clearAuthStorage();
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    if (!state.user) return false;
    if (roles.length === 0) return true;
    if (roles.includes(state.user.role)) return true;
    if (state.user.role === 'owner') return true;
    return false;
  }, [state.user]);

  const isOwner = state.user?.role === 'owner';
  const isManager = state.user?.role === 'manager';

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
    refreshSession,
    hasRole,
    isOwner,
    isManager,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export type { AuthContextType, AuthState };
