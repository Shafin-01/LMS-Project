/**
 * Base URL for the Strapi backend instance.
 * Defaults to http://localhost:1337 if NEXT_PUBLIC_STRAPI_API_URL is not set.
 */
export const API_URL: string =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";

export interface StrapiErrorResponse {
  data: null;
  error: {
    status: number;
    name: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Generic helper to fetch data from Strapi API endpoints.
 *
 * @template T - Expected return type of the Strapi response
 * @param path - The API endpoint path (e.g., '/articles' or '/articles?populate=*')
 * @param init - Optional standard RequestInit object (Next.js fetch options like revalidate/cache)
 * @returns Parsed JSON response of type T
 *
 * @example
 * ```ts
 * interface Article {
 *   id: number;
 *   documentId: string;
 *   title: string;
 * }
 *
 * interface ArticlesResponse {
 *   data: Article[];
 *   meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
 * }
 *
 * const articles = await fetchAPI<ArticlesResponse>('/articles?populate=*', {
 *   next: { revalidate: 60 },
 * });
 * ```
 */
export async function fetchAPI<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const requestUrl = `${API_URL}/api${normalizedPath}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Optional: Attach Strapi API token if configured in environment variables
  const apiToken = process.env.STRAPI_API_TOKEN;
  if (apiToken) {
    (defaultHeaders as Record<string, string>)["Authorization"] = `Bearer ${apiToken}`;
  }

  const response = await fetch(requestUrl, {
    cache: "no-store",
    ...init,
    headers: {
      ...defaultHeaders,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `Failed to fetch from Strapi (${response.status}: ${response.statusText})`;
    try {
      const errorData = (await response.json()) as StrapiErrorResponse;
      if (errorData?.error?.message) {
        errorMessage = `Strapi Error (${errorData.error.status || response.status}): ${errorData.error.message}`;
      }
    } catch {
      // Fall back to default status text if response is not JSON
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as T;
  return data;
}