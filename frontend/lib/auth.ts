/**
 * Client-side Authentication utilities for FloodWheel Admin.
 * Handles JWT token storage in localStorage, auth headers, and login status.
 */

export interface AdminUser {
  username: string;
  role: string;
  logged_in_at?: string;
}

const TOKEN_KEY = "floodwheel_admin_token";
const USER_KEY = "floodwheel_admin_user";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAdminAuth(token: string, user: AdminUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Dispatch custom event for real-time navbar reactivity
  window.dispatchEvent(new Event("floodwheel_auth_change"));
}

export function clearAdminAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("floodwheel_auth_change"));
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

/**
 * Enhanced fetch wrapper that automatically appends the Bearer JWT token if available.
 */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
