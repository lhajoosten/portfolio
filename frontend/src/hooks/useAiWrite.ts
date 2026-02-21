/**
 * useAiWrite — SSE streaming hook for the AI writing assistant.
 *
 * Sends a POST to `/api/v1/ai/write` and reads the Server-Sent Events
 * response body as a stream, calling callbacks for each token, on completion,
 * and on error.  Uses the same base-URL resolution strategy as the rest of
 * the Hey API client so the Vite dev-server proxy is respected.
 *
 * ## Usage
 * ```ts
 * const { write, isStreaming, abort } = useAiWrite();
 *
 * await write({
 *   prompt: "Write an intro about RAG pipelines",
 *   mode: "write",
 *   context: editor.getHTML(),   // optional — sent for improve/summarise
 *   onToken: (chunk) => { ... }, // called for every streamed token
 *   onDone: () => { ... },       // called when stream ends cleanly
 *   onError: (msg) => { ... },   // called on network or AI error
 * });
 * ```
 *
 * @module
 */

import { useCallback, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Modes supported by the backend WriteRequest schema. */
export type WriteMode = "write" | "improve" | "summarise";

export interface WriteOptions {
  prompt: string;
  mode: WriteMode;
  /** Optional editor content — used as grounding context for improve/summarise. */
  context?: string;
  /** Called with each raw text chunk as it arrives from the stream. */
  onToken: (chunk: string) => void;
  /** Called once the stream ends cleanly (after the `[DONE]` sentinel). */
  onDone: () => void;
  /** Called if the stream ends with an error (network, HTTP, or AI service). */
  onError: (message: string) => void;
}

export interface UseAiWriteReturn {
  /** Initiate a streaming AI request. Resolves when the stream closes. */
  write: (opts: WriteOptions) => Promise<void>;
  /** True while a stream is in flight. */
  isStreaming: boolean;
  /** Abort the current in-flight stream (no-op if idle). */
  abort: () => void;
}

// ---------------------------------------------------------------------------
// Base URL — mirrors the resolution logic in lib/api-client.ts
// ---------------------------------------------------------------------------

/**
 * Empty string → relative URL → forwarded by the Vite proxy (`/api → backend`)
 * Non-empty string → absolute URL used as-is (production / Docker / CI)
 */
const API_BASE: string =
  typeof import.meta.env.VITE_API_BASE_URL === "string" &&
  import.meta.env.VITE_API_BASE_URL.length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : "";

const WRITE_ENDPOINT = `${API_BASE}/api/v1/ai/write`;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAiWrite(): UseAiWriteReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const write = useCallback(async (opts: WriteOptions): Promise<void> => {
    const { prompt, mode, context, onToken, onDone, onError } = opts;

    // Cancel any previous in-flight request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);

    try {
      const response = await fetch(WRITE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Include the httpOnly auth cookie that the login endpoint sets.
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          mode,
          context: context ?? null,
        }),
      });

      if (!response.ok) {
        // Try to extract a detail message from the JSON body, fall back to
        // the HTTP status text.
        let detail = response.statusText;
        try {
          const json = (await response.json()) as { detail?: string };
          if (json.detail) detail = json.detail;
        } catch {
          // ignore JSON parse failure
        }
        onError(`HTTP ${response.status}: ${detail}`);
        return;
      }

      if (!response.body) {
        onError("Server returned an empty response body.");
        return;
      }

      // ── SSE parsing ────────────────────────────────────────────────────────
      //
      // The backend emits:
      //   data: <token text>\n\n     ← one or more of these
      //   data: [DONE]\n\n           ← terminal sentinel
      //   event: error\ndata: <msg>\n\n  ← on AI service error
      //
      // We read raw bytes and split on newlines to reconstruct SSE lines.
      // A partial last line is held in `buffer` until the next chunk arrives.

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let isErrorEvent = false;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on newlines, keeping the (potentially incomplete) final segment.
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line === "event: error") {
            isErrorEvent = true;
            continue;
          }

          if (line.startsWith("data: ")) {
            const data = line.slice(6); // strip the "data: " prefix

            if (data === "[DONE]") {
              onDone();
              break outer;
            }

            if (isErrorEvent) {
              onError(data);
              isErrorEvent = false;
              break outer;
            }

            onToken(data);
            continue;
          }

          // Blank line resets the SSE event boundary.
          if (line === "") {
            isErrorEvent = false;
          }
        }
      }

      // Handle anything left in the buffer after the stream closes without
      // an explicit [DONE] — shouldn't happen with a well-behaved server but
      // we call onDone to ensure the UI always settles.
      onDone();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User-initiated abort — treat as a clean completion so the UI
        // marks the last message as no longer streaming.
        onDone();
        return;
      }
      onError(err instanceof Error ? err.message : "Unknown error contacting AI service.");
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { write, isStreaming, abort };
}
