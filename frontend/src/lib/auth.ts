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
        "Your session has expired. Please log in again."
      );
    }

    if (res.status === 403) {
      throw new Error(
        data?.error?.message ||
          "You do not have permission to do this."
      );
    }

    throw new Error(
      data?.error?.message ||
        "Request failed"
    );
  }

  return data;
}

/**
 * Uploads a single file to Strapi's built-in Upload plugin and returns the
 * uploaded file's fully-qualified URL. This lets a form offer a real
 * "Upload Image" button instead of asking the user to manually copy a URL
 * from the Strapi Media Library.
 *
 * This intentionally does NOT reuse authFetch(): a multipart/form-data
 * request must not have its Content-Type header set manually, since the
 * browser needs to generate the correct boundary value itself.
 */
export async function uploadImage(file: File): Promise<string> {
  const baseUrl =
    process.env.NEXT_PUBLIC_STRAPI_API_URL ||
    "http://localhost:1337";

  const token = getToken();
  const formData = new FormData();
  formData.append("files", file);

  const res = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        "You do not have permission to upload files. Ask an Admin to enable the Upload permission for your role."
      );
    }
    throw new Error(data?.error?.message || "Image upload failed. Please try again.");
  }

  // Strapi's /api/upload endpoint returns an array of uploaded file objects.
  const uploaded = Array.isArray(data) ? data[0] : null;

  if (!uploaded?.url) {
    throw new Error("Image upload succeeded but no file URL was returned.");
  }

  // The local Upload provider returns a relative path (e.g. "/uploads/photo.jpg").
  // An absolute URL is needed so the image renders directly in an <img> tag.
  return uploaded.url.startsWith("http") ? uploaded.url : `${baseUrl}${uploaded.url}`;
}