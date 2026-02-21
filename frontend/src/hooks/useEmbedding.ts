/**
 * useEmbedding — hooks for the embedding status panel and re-embed action.
 *
 * Provides two hooks:
 *
 * - `useEmbedStatus()` — polls `GET /api/v1/ai/embed-status` every 30 s while
 *   the window is focused, giving live index counts per content table.
 *
 * - `useReEmbed()` — fires `POST /api/v1/ai/re-embed` and returns loading /
 *   result state.  Automatically invalidates the embed-status query on success
 *   so the counts refresh without a manual refetch.
 *
 * Both hooks use raw `fetch` (not the generated Hey API client) because the
 * endpoints are admin-only and not part of the public OpenAPI surface that
 * the generated client covers.
 *
 * @module
 */

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmbedStatusItem {
  total: number;
  indexed: number;
}

export interface EmbedStatus {
  model: string;
  dims: number;
  projects: EmbedStatusItem;
  posts: EmbedStatusItem;
  certifications: EmbedStatusItem;
}

export interface ReEmbedResult {
  indexed: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// Shared base URL — mirrors useAiWrite.ts resolution logic
// ---------------------------------------------------------------------------

const API_BASE: string =
  typeof import.meta.env.VITE_API_BASE_URL === "string" &&
  import.meta.env.VITE_API_BASE_URL.length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : "";

const EMBED_STATUS_URL = `${API_BASE}/api/v1/ai/embed-status`;
const RE_EMBED_URL = `${API_BASE}/api/v1/ai/re-embed`;

// Stable query key — used by both the query and the mutation invalidation.
export const EMBED_STATUS_QUERY_KEY = ["ai", "embed-status"] as const;

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchEmbedStatus(): Promise<EmbedStatus> {
  const res = await fetch(EMBED_STATUS_URL, {
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`embed-status ${res.status}: ${text}`);
  }
  return res.json() as Promise<EmbedStatus>;
}

// ---------------------------------------------------------------------------
// useEmbedStatus
// ---------------------------------------------------------------------------

/**
 * Poll the embedding index status.
 *
 * Refetches automatically every 30 s while the window is focused, and
 * immediately after a successful `useReEmbed` call.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useEmbedStatus();
 * if (data) {
 *   console.log(data.model, data.dims);
 *   console.log(`${data.projects.indexed}/${data.projects.total} projects indexed`);
 * }
 * ```
 */
export function useEmbedStatus() {
  return useQuery<EmbedStatus, Error>({
    queryKey: EMBED_STATUS_QUERY_KEY,
    queryFn: fetchEmbedStatus,
    // Refresh every 30 s while the window is focused.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    // Keep stale data visible while a background refetch is in flight.
    staleTime: 20_000,
  });
}

// ---------------------------------------------------------------------------
// useReEmbed
// ---------------------------------------------------------------------------

export interface UseReEmbedReturn {
  /** Trigger the re-embed job. Returns the result summary or throws on error. */
  reEmbed: () => Promise<ReEmbedResult>;
  /** True while the request is in flight. */
  isReEmbedding: boolean;
  /** Result from the last successful run, or null if never run / in progress. */
  lastResult: ReEmbedResult | null;
  /** Error message from the last failed run, or null. */
  error: string | null;
}

/**
 * Trigger a full re-embed of all content (projects, posts, certifications).
 *
 * Invalidates the embed-status query on success so index counts refresh
 * automatically.
 *
 * @example
 * ```tsx
 * const { reEmbed, isReEmbedding, lastResult, error } = useReEmbed();
 *
 * <button onClick={() => void reEmbed()} disabled={isReEmbedding}>
 *   {isReEmbedding ? "Indexing…" : "Re-embed →"}
 * </button>
 * {lastResult && <span>{lastResult.indexed} indexed, {lastResult.errors} errors</span>}
 * ```
 */
export function useReEmbed(): UseReEmbedReturn {
  const queryClient = useQueryClient();
  const [isReEmbedding, setIsReEmbedding] = useState(false);
  const [lastResult, setLastResult] = useState<ReEmbedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reEmbed = useCallback(async (): Promise<ReEmbedResult> => {
    setIsReEmbedding(true);
    setError(null);

    try {
      const res = await fetch(RE_EMBED_URL, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`re-embed ${res.status}: ${text}`);
      }

      const result = (await res.json()) as ReEmbedResult;
      setLastResult(result);

      // Invalidate the status query so counts refresh immediately.
      await queryClient.invalidateQueries({ queryKey: EMBED_STATUS_QUERY_KEY });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setIsReEmbedding(false);
    }
  }, [queryClient]);

  return { reEmbed, isReEmbedding, lastResult, error };
}
