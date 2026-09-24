/**
 * PromptForge Base API Client and Error Utilities
 */

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Format error responses from FastAPI / Pydantic into human-readable messages.
 */
export function formatErrorDetail(status: number, data: any): string {
  if (data?.detail) {
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item: any) => {
          if (item?.msg) {
            return item.msg.replace(/^Value error,\s*/i, "");
          }
          return typeof item === "string" ? item : JSON.stringify(item);
        })
        .join(". ");
    }
  }

  if (status === 400) return "Invalid request. Please check your information.";
  if (status === 401) return "Invalid email or password.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "Requested resource was not found.";
  if (status === 422) return "Validation failed. Please verify your inputs.";
  if (status >= 500) return "A server error occurred. Please try again later.";

  return "An unexpected error occurred. Please try again.";
}

/**
 * Universal request wrapper for PromptForge API
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      "Unable to connect to the PromptForge server. Please ensure the backend is running.",
      0
    );
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = formatErrorDetail(res.status, data);
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
