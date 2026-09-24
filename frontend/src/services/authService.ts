/**
 * PromptForge Authentication Service
 */
import { apiRequest } from "./apiClient";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export const authService = {
  /**
   * Log in user: POST /auth/login
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  /**
   * Register new user: POST /auth/register
   */
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    return apiRequest<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  /**
   * Get current user profile: GET /auth/me
   */
  async getCurrentUser(token: string): Promise<AuthUser> {
    return apiRequest<AuthUser>("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
