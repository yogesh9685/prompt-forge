import { authService } from "@/services/authService";

export interface User {
  id?: number;
  name?: string;
  email: string;
}

const TOKEN_KEY = "pf-token";
const USER_KEY = "pf-user";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthData(user: User, token?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);
  return !!token && !!user;
}

/**
 * Validate token with backend /auth/me and sync stored user profile.
 * If token is expired or invalid, clears auth data.
 */
export async function syncCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) {
    clearAuthData();
    return null;
  }

  try {
    const profile = await authService.getCurrentUser(token);
    setAuthData(profile, token);
    return profile;
  } catch (err: any) {
    if (err?.status === 401) {
      clearAuthData();
    }
    return null;
  }
}
