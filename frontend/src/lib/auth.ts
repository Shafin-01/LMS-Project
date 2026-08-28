"use client";

export interface StrapiUser {
  id: number;
  username: string;
  email: string;
  role?: {
    id: number;
    name: string;
    type: string;
  };
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("jwt");
}

export function getUser(): StrapiUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem("user");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StrapiUser;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function logout() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("jwt");
  localStorage.removeItem("user");
}

export async function authFetch(
  path: string,
  options: RequestInit = {}
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_STRAPI_API_URL ||
    "http://localhost:1337";

  const token = getToken();

  const headers = new Headers(
    options.headers
  );

  if (!headers.has("Content-Type")) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const res = await fetch(
    `${baseUrl}/api${normalizedPath}`,
    {
      ...options,
      headers,
    }
  );

  const data = await res
    .json()
    .catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        "তোমার session শেষ হয়ে গেছে। আবার login করো।"
      );
    }

    if (res.status === 403) {
      throw new Error(
        data?.error?.message ||
          "এই কাজ করার permission তোমার নেই।"
      );
    }

    throw new Error(
      data?.error?.message ||
        "Request failed"
    );
  }

  return data;
}