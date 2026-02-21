/**
 * Hey API client configuration.
 *
 * ## URL strategy
 *
 * The generated `client.gen.ts` embeds the OpenAPI server URL
 * (`http://localhost:8000`) as a fallback inside `createConfig`.  We must
 * **never** fall back to that value in development because it bypasses the
 * Vite proxy and causes CORS errors.
 *
 * Rules:
 * - `VITE_API_BASE_URL` is set (non-empty)  → use it as-is (production / CI)
 * - `VITE_API_BASE_URL` is empty or unset   → use `""` so all requests are
 *   relative and are forwarded by the Vite dev-server proxy (`/api → backend`)
 *
 * The previous implementation used `baseUrl || config.baseUrl || ""` which
 * treated an intentional empty string as falsy and fell through to the
 * hardcoded `http://localhost:8000` from the generated client — breaking
 * the proxy setup and producing CORS errors.
 */

import { createClient, type ClientOptions, type Config } from "./api/client";

// ---------------------------------------------------------------------------
// Resolve base URL
// ---------------------------------------------------------------------------

/**
 * Explicit base URL for all API requests.
 *
 * - Non-empty string → absolute URL (production / docker / staging)
 * - Empty string     → relative URLs, forwarded by the Vite proxy
 *
 * The value is read once at module load time so that it is a stable constant
 * for the lifetime of the page.
 */
const BASE_URL: string =
  typeof import.meta.env.VITE_API_BASE_URL === "string" &&
  import.meta.env.VITE_API_BASE_URL.length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : "";

// ---------------------------------------------------------------------------
// Credentials middleware
// ---------------------------------------------------------------------------

/**
 * Drop-in `fetch` replacement that always sends the httpOnly auth cookie.
 *
 * All requests — whether through the Vite proxy or to an absolute URL — need
 * `credentials: "include"` so the browser attaches the `access_token` cookie
 * set by `POST /api/v1/auth/login`.
 */
const fetchWithCredentials: typeof fetch = (input, init) =>
  fetch(input, { ...init, credentials: "include" });

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/**
 * Build the final Hey API client config.
 *
 * Accepts an optional `override` so callers (or the generated `client.gen.ts`)
 * can provide their own defaults — but `baseUrl` and `fetch` are always
 * overwritten by our resolved values.  This prevents the generated file's
 * hardcoded `http://localhost:8000` from leaking into the final config.
 *
 * @param override - Optional base config (ignored for `baseUrl` and `fetch`).
 * @returns Merged config with our `baseUrl` and `fetch` always in effect.
 */
export const createClientConfig = (
  override: Config<ClientOptions> = {},
): Config<ClientOptions> => ({
  ...override,
  // Explicitly set baseUrl — never inherit the generated fallback.
  // An empty string is valid and means "same-origin / Vite proxy".
  baseUrl: BASE_URL,
  fetch: fetchWithCredentials,
});

// ---------------------------------------------------------------------------
// Singleton client (used by domain hooks directly if needed)
// ---------------------------------------------------------------------------

export const apiClient = createClient(createClientConfig());

export default apiClient;
