import type { ApiEnvelope, ApiError } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

let currentRole = "ADMIN";

export function setApiRole(role: string) {
  currentRole = role;
}

export function getApiRole(): string {
  return currentRole;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];
  readonly serverErrors: ApiError[];

  constructor(status: number, message: string, errors: ApiError[]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = errors[0]?.code ?? "HTTP_ERROR";
    this.details = errors[0]?.details ?? [];
    this.serverErrors = errors;
  }
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; role?: string } = {},
): Promise<T> {
  const { method = "GET", body, role } = options;
  const headers: Record<string, string> = {
    "X-User-Role": role ?? currentRole,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.errors.length > 0) {
    const errors = payload?.errors ?? [
      {
        code: "HTTP_ERROR",
        message: `Erreur HTTP ${response.status}`,
        details: [],
      },
    ];
    throw new ApiClientError(response.status, errors[0].message, errors);
  }

  return payload.data as T;
}

export function isInsufficientDataError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === "INSUFFICIENT_HISTORICAL_DATA";
}

export function isModelUnavailableError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === "MODEL_UNAVAILABLE";
}
