/**
 * Typed error handling for the Hey API / FastAPI error contract.
 *
 * The backend always returns errors in the shape:
 *   { detail: string, request_id?: string }
 *
 * Hey API wraps HTTP errors and throws them when `throwOnError: true` is set.
 * This module provides a typed `ApiError` class and a `parseApiError` helper
 * that normalises any thrown value into a human-readable message.
 */

// ---------------------------------------------------------------------------
// Backend error shape
// ---------------------------------------------------------------------------

export type BackendErrorBody = {
  detail: string;
  request_id?: string;
};

export type ValidationErrorBody = {
  detail: Array<{
    loc: Array<string | number>;
    msg: string;
    type: string;
    input?: unknown;
    ctx?: Record<string, unknown>;
  }>;
  request_id?: string;
};

// ---------------------------------------------------------------------------
// ApiError class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  /** HTTP status code (e.g. 404, 409, 422, 500). */
  readonly status: number;

  /** Human-readable message extracted from the response body. */
  readonly detail: string;

  /** Server-assigned trace ID — echo back to support / logs. */
  readonly requestId: string | undefined;

  /** The raw response body, if available. */
  readonly body: unknown;

  constructor({
    status,
    detail,
    requestId,
    body,
  }: {
    status: number;
    detail: string;
    requestId?: string;
    body?: unknown;
  }) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.requestId = requestId;
    this.body = body;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isBackendErrorBody(value: unknown): value is BackendErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "detail" in value &&
    typeof (value as Record<string, unknown>)["detail"] === "string"
  );
}

function isValidationErrorBody(value: unknown): value is ValidationErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "detail" in value &&
    Array.isArray((value as Record<string, unknown>)["detail"])
  );
}

function isHeyApiError(value: unknown): value is { status: number; error: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as Record<string, unknown>)["status"] === "number"
  );
}

// ---------------------------------------------------------------------------
// parseApiError — normalises any thrown value into an ApiError
// ---------------------------------------------------------------------------

/**
 * Convert any caught value into an `ApiError`.
 *
 * Handles:
 * - Hey API response errors (`{ status, error }`)
 * - Plain `Error` instances
 * - Unknown thrown values
 *
 * @example
 * try {
 *   await someApiCall({ throwOnError: true })
 * } catch (err) {
 *   const apiError = parseApiError(err)
 *   toast.error(apiError.detail)
 * }
 */
export function parseApiError(error: unknown): ApiError {
  // Hey API throws an object with `{ status, error }` when throwOnError is set
  if (isHeyApiError(error)) {
    const { status, error: body } = error as { status: number; error: unknown };

    if (isValidationErrorBody(body)) {
      // FastAPI validation errors — join all messages
      const messages = body.detail.map((e) => `${e.loc.join(".")}: ${e.msg}`).join("; ");
      return new ApiError({
        status,
        detail: messages,
        requestId: body.request_id,
        body,
      });
    }

    if (isBackendErrorBody(body)) {
      return new ApiError({
        status,
        detail: body.detail,
        requestId: body.request_id,
        body,
      });
    }

    // Fallback for unexpected body shapes
    return new ApiError({
      status,
      detail: httpStatusMessage(status),
      body,
    });
  }

  // Standard Error
  if (error instanceof Error) {
    return new ApiError({ status: 0, detail: error.message });
  }

  // String thrown
  if (typeof error === "string") {
    return new ApiError({ status: 0, detail: error });
  }

  return new ApiError({ status: 0, detail: "An unexpected error occurred" });
}

// ---------------------------------------------------------------------------
// useApiError — extract a display string from any error value
// ---------------------------------------------------------------------------

/**
 * Convert any error value to a string suitable for display in the UI.
 * Prefer `parseApiError` for richer structured access.
 */
export function getErrorMessage(error: unknown): string {
  return parseApiError(error).detail;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function httpStatusMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "Bad request",
    401: "Unauthorised — please log in",
    403: "You do not have permission to perform this action",
    404: "Resource not found",
    409: "A conflict occurred — the resource may already exist",
    422: "The request data is invalid",
    429: "Too many requests — please slow down",
    500: "Internal server error",
    502: "Upstream service error",
    503: "Service unavailable",
  };
  return messages[status] ?? `Request failed with status ${status}`;
}
