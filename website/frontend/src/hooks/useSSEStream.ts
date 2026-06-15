/**
 * useSSEStream — Reusable SSE streaming hook (Phase 5)
 *
 * Streams JSON events from a POST endpoint that returns SSE-formatted data.
 * Uses fetch() + ReadableStream + TextDecoder rather than EventSource
 * (which only supports GET). Each `data: {...}\n\n` line is parsed as JSON
 * and appended to the reactive `data` array.
 *
 * Reused by:
 *  - TrainerPanel (Phase 5)
 *  - QNN Workbench  (Phase 6)
 */

import { useState, useRef, useCallback } from 'react';

export interface UseSSEStreamResult<T> {
  /** Accumulated parsed events, newest last. */
  data: T[];
  /** True while the stream is open. */
  isStreaming: boolean;
  /** Human-readable error, or null. */
  error: string | null;
  /** Open a stream. `body` is JSON-serialised and POSTed. */
  start: (url: string, body: any) => void;
  /** Abort the current stream. */
  stop: () => void;
}

export function useSSEStream<T>(): UseSSEStreamResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const start = useCallback(
    (url: string, body: any) => {
      // Abort any previous stream
      stop();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setError(null);
      setData([]);

      (async () => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            throw new Error(
              `HTTP ${response.status}: ${errBody || response.statusText}`
            );
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('Response body is not readable');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE lines (terminated by \n\n or \n)
            const lines = buffer.split('\n');
            // Keep the last (potentially incomplete) chunk
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue; // skip empty lines & comments
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.slice(5).trim();
                if (!jsonStr) continue;
                try {
                  const parsed = JSON.parse(jsonStr) as T;
                  setData((prev) => [...prev, parsed]);
                } catch {
                  // Skip malformed JSON lines
                  console.warn('[useSSEStream] Could not parse:', jsonStr);
                }
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr) {
                try {
                  const parsed = JSON.parse(jsonStr) as T;
                  setData((prev) => [...prev, parsed]);
                } catch {
                  // ignore
                }
              }
            }
          }

          setIsStreaming(false);
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // User-initiated abort — not an error
            setIsStreaming(false);
            return;
          }
          setError(err.message || 'Stream failed');
          setIsStreaming(false);
        }
      })();
    },
    [stop]
  );

  return { data, isStreaming, error, start, stop };
}

export default useSSEStream;
