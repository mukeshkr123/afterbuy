import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { z } from "zod";
import { createApi, type ApiRequest } from "./client";
import { useApiBaseUrl } from "../hooks/useApiBaseUrl";
import { outbox, type OutboxEntry } from "../offline/outbox";

const ApiContext = createContext<ApiRequest | null>(null);

/**
 * ApiProvider exposes the typed API client AND, as a side-effect, wires the
 * outbox replayer. The replayer uses a private `rawApi` (the same client,
 * without going back through the outbox) so replays do not recurse into
 * enqueue.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
  const baseUrl = useApiBaseUrl();
  const { getToken } = useClerkAuth();

  // Build the underlying client first — this is what replays use.
  const rawApi = useMemo<ApiRequest>(
    () =>
      createApi({
        baseUrl,
        getToken: async () => {
          try {
            return (await getToken()) ?? null;
          } catch {
            return null;
          }
        },
      }),
    [baseUrl, getToken]
  );

  // The context-exposed `api` is the public client. It routes writes
  // through the outbox via useEnqueueMutation; reads pass through directly.
  // We expose the same rawApi here — the outbox decision happens at the
  // call site, not in the client, so the request stays a single fetch.
  const api = useMemo<ApiRequest>(() => rawApi, [rawApi]);

  useEffect(() => {
    outbox.replayer = {
      request: async (entry: OutboxEntry) => {
        // Outbox entries are JSON-serializable; replays always go through
        // the JSON content-type path. Multipart uploads (receipts) are
        // staged on the local file system separately and not in the outbox.
        return rawApi({
          method: entry.method,
          path: entry.endpoint,
          body: entry.body ?? undefined,
          schema: z.unknown(),
          idempotencyKey: entry.idempotencyKey,
        });
      },
    };
    void outbox.hydrate();
    return () => {
      outbox.replayer = null;
    };
  }, [rawApi]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiRequest {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error("useApi must be used inside <ApiProvider>");
  }
  return ctx;
}
