import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { storage } from "./storage";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000, // 24h, mirrors API idempotency cache TTL
    },
    mutations: {
      retry: 0, // Phase 8 outbox decides whether to replay; do not double-fire
    },
  },
});

export const queryPersister: Persister = createAsyncStoragePersister({
  storage,
});
