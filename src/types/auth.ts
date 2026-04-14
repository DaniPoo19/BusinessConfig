// ============================================
// Authentication Types
// Matches backend API responses
// ============================================

export type UserRole = 'owner' | 'manager' | 'chef' | 'delivery' | 'cashier' | 'waiter' | 'staff' | 'pending';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_id: string;
  company_name?: string;
  company_nit?: string;
  sale_point_ids: string[];
  is_active: boolean;
  email_verified?: boolean;
  phone?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: 'Bearer';
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: 'Bearer';
}

export interface LogoutRequest {
  refresh_token: string;
}
