// ============================================
// Authentication API Service
// Shared auth pattern — same backend as HeldariaGestionFrontEnd
// ============================================

import { env } from '../config/environment';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  TokenResponse,
  LogoutRequest,
  User,
} from '../types/auth';

const API_BASE_URL = `${env.apiUrl}/api/v1`;

// ============================================
// CSRF Token Helper
// ============================================

function getCSRFToken(): string | null {
  const name = 'csrf_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(name)) {
      return trimmed.substring(name.length);
    }
  }
  return null;
}

// ============================================
// Response Handler
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  let data: ApiResponse<T>;

  try {
    data = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`Error del servidor (${response.status}): No se pudo procesar la respuesta`);
  }

  if (!response.ok || !data.success) {
    const errorMessage = data.error || data.message || `Error ${response.status}`;
    throw new Error(errorMessage);
  }

  return data.data as T;
}

// ============================================
// Token Storage
// ============================================

const STORAGE_PREFIX = 'cfgmgr_';
const STORAGE_KEYS = {
  ACCESS_TOKEN: `${STORAGE_PREFIX}access_token`,
  REFRESH_TOKEN: `${STORAGE_PREFIX}refresh_token`,
  TOKEN_EXPIRY: `${STORAGE_PREFIX}token_exp`,
  USER: `${STORAGE_PREFIX}user`,
} as const;

function getStorage(): Storage {
  return env.isProduction ? sessionStorage : localStorage;
}

export function getStoredAccessToken(): string | null {
  try {
    const token = getStorage().getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return null;
    return decodeURIComponent(atob(token));
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    const token = getStorage().getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!token) return null;
    return decodeURIComponent(atob(token));
  } catch {
    return null;
  }
}

export function storeTokens(accessToken: string, refreshToken: string, expiresAt: string): void {
  try {
    const storage = getStorage();
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, btoa(encodeURIComponent(accessToken)));
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, btoa(encodeURIComponent(refreshToken)));
    storage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, btoa(encodeURIComponent(expiresAt)));
  } catch {
    if (import.meta.env.DEV) console.error('[Auth] Error storing tokens');
  }
}

export function storeUser(user: User): void {
  try {
    getStorage().setItem(STORAGE_KEYS.USER, btoa(encodeURIComponent(JSON.stringify(user))));
  } catch {
    console.error('[Auth] Error storing user');
  }
}

export function getStoredUser(): User | null {
  try {
    const userData = getStorage().getItem(STORAGE_KEYS.USER);
    if (!userData) return null;
    return JSON.parse(decodeURIComponent(atob(userData))) as User;
  } catch {
    return null;
  }
}

export function clearAuthStorage(): void {
  const storage = getStorage();
  Object.values(STORAGE_KEYS).forEach(key => storage.removeItem(key));
}

export function isTokenExpired(): boolean {
  try {
    const expiry = getStorage().getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiry) return true;
    const expiryDate = new Date(decodeURIComponent(atob(expiry)));
    return Date.now() >= expiryDate.getTime() - 30000;
  } catch {
    return true;
  }
}

export function getCSRFHeader(): Record<string, string> {
  const csrfToken = getCSRFToken();
  if (!csrfToken) return {};
  return { 'X-CSRF-Token': csrfToken };
}

// ============================================
// Auth API
// ============================================

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });
    return handleResponse<LoginResponse>(response);
  },

  async refreshToken(request?: RefreshTokenRequest): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request ? JSON.stringify(request) : '{}',
      credentials: 'include',
    });
    return handleResponse<TokenResponse>(response);
  },

  async logout(request?: LogoutRequest): Promise<void> {
    const csrfHeader = getCSRFHeader();
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeader },
      body: request ? JSON.stringify(request) : '{}',
      credentials: 'include',
    });
    if (!response.ok && import.meta.env.DEV) {
      console.warn('[Auth] Logout request failed, clearing local session anyway');
    }
  },

  async getMe(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse<User>(response);
  },
};

// ============================================
// Fetch with Auto Token Refresh
// ============================================

let isRefreshingToken = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshingToken && refreshPromise) return refreshPromise;

  const refreshToken = getStoredRefreshToken();
  isRefreshingToken = true;

  refreshPromise = (async () => {
    try {
      const response = await authApi.refreshToken(
        refreshToken ? { refresh_token: refreshToken } : undefined
      );
      storeTokens(response.access_token, response.refresh_token, response.expires_at);
      if (import.meta.env.DEV) console.log('[Auth] Token refreshed successfully');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Auth] Token refresh failed:', error);
      clearAuthStorage();
      return false;
    } finally {
      isRefreshingToken = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  if (isTokenExpired()) {
    if (import.meta.env.DEV) console.log('[Auth] Token expired, attempting refresh');
    const refreshed = await attemptTokenRefresh();
    if (!refreshed) {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      throw new Error('La sesión ha expirado. Por favor inicia sesión nuevamente.');
    }
  }

  const headers = new Headers(options.headers);
  const method = options.method?.toUpperCase() || 'GET';
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrfToken = getCSRFToken();
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  let response = await fetch(url, { ...options, headers, credentials: 'include' });

  if (response.status === 401) {
    if (import.meta.env.DEV) console.log('[Auth] Got 401, attempting token refresh');
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      response = await fetch(url, { ...options, headers, credentials: 'include' });
    } else {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      throw new Error('La sesión ha expirado. Por favor inicia sesión nuevamente.');
    }
  }

  return response;
}
