// src/utils/auth.ts
export type UserRole = "ADMIN" | "USER";

export type CurrentUser = {
  id?: number | string;
  fullName?: string;
  email?: string;
  role?: UserRole | string;
};

const USER_STORAGE_KEY = "user";

export function getCurrentUser(): CurrentUser | null {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!rawUser) return null;
  try {
    const parsedUser = JSON.parse(rawUser) as CurrentUser;
    if (!parsedUser || typeof parsedUser !== "object") {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
    return parsedUser;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function isAdmin(user: CurrentUser | null): boolean {
  return user?.role === "ADMIN";
}

export function saveCurrentUser(user: CurrentUser) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth-changed"));
}

export function logout() {
  localStorage.removeItem(USER_STORAGE_KEY);
  window.dispatchEvent(new Event("auth-changed"));
}
