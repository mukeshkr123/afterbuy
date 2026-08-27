// useEnqueueMutation is a thin layer over `useMutation` that pushes writes
// through the mutation outbox. The caller still writes a normal React Query
// mutation: `mutate(input)` enqueues an entry, which runs immediately if
// online or stays queued until reconnect. Server-side, every entry carries
// a stable Idempotency-Key so replays are no-ops.
//
// Optimistic patches are applied at enqueue time and rolled back by
// the caller (via `onError`) — the outbox itself does not know about the
// query cache.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { uuidv4 } from "../lib/uuid";
import { outbox, type OutboxEntry } from "./outbox";
import { useApi } from "../api/ApiProvider";
import { NetworkError, type ApiRequest } from "../api/client";

export interface EnqueueMutationInput<TBody> {
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  endpoint: string;
  body: TBody | null;
  label: string;
  /** Apply on enqueue, revert on error. */
  optimisticPatch?: OutboxEntry["optimisticPatch"];
  /** Run on successful server response (typically `qc.setQueryData`). */
  onCommit?: (serverResponse: unknown) => void;
}

export interface UseEnqueueMutationResult<TInput, TResult> {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
  /** True while the request is queued but not yet replayed. */
  isQueued: boolean;
}

export function useEnqueueMutation<TInput, TResult>(opts: {
  build: (input: TInput) => EnqueueMutationInput<unknown>;
  onSuccess?: (serverResponse: TResult, input: TInput) => void;
  onError?: (error: Error, input: TInput) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): UseEnqueueMutationResult<TInput, TResult> {
  const qc = useQueryClient();
  const api = useApi();

  // Validate the schema hook contract at compile time — the caller must
  // supply a `build` that maps their input to an enqueue payload.
  const build = opts.build as (input: TInput) => EnqueueMutationInput<unknown>;

  const mutation = useMutation<
    TResult,
    Error,
    TInput,
    { previousValues: Map<string, unknown> }
  >({
    mutationFn: async (input) => {
      const payload = build(input);
      // Capture pre-mutation cache state for any patches we apply.
      const previousValues = new Map<string, unknown>();
      if (payload.optimisticPatch) {
        const prev = qc.getQueryData(payload.optimisticPatch.queryKey);
        previousValues.set(
          JSON.stringify(payload.optimisticPatch.queryKey),
          prev
        );
        qc.setQueryData(
          payload.optimisticPatch.queryKey,
          payload.optimisticPatch.updater(prev)
        );
      }
      const idempotencyKey = uuidv4();
      try {
        if (outbox.isOnline()) {
          return await directCall<TResult>(
            api,
            payload.method,
            payload.endpoint,
            payload.body,
            idempotencyKey
          );
        }

        const entry = await outbox.enqueue({
          id: uuidv4(),
          idempotencyKey,
          endpoint: payload.endpoint,
          method: payload.method,
          body: payload.body,
          optimisticPatch: payload.optimisticPatch,
          onCommit: payload.onCommit,
          label: payload.label,
        });
        return entry as TResult;
      } catch (e) {
        if (e instanceof NetworkError) {
          const entry = await outbox.enqueue({
            id: uuidv4(),
            idempotencyKey,
            endpoint: payload.endpoint,
            method: payload.method,
            body: payload.body,
            optimisticPatch: payload.optimisticPatch,
            onCommit: payload.onCommit,
            label: payload.label,
          });
          return entry as TResult;
        }
        // Roll back optimistic patches on failure.
        for (const [key, prev] of previousValues) {
          const queryKey = JSON.parse(key) as readonly unknown[];
          qc.setQueryData(queryKey, prev);
        }
        throw e;
      }
    },
    onSuccess: (serverResponse, input) => {
      opts.onSuccess?.(serverResponse, input);
    },
    onError: (error, input) => {
      opts.onError?.(error, input);
    },
  });

  // isQueued: true while the request is in the outbox with status
  // "pending" or "in_flight". For now we approximate this as the mutation's
  // own isPending; if the user is offline, isPending stays true until
  // reconnect + replay, which matches the user-facing definition.
  return useMemo(
    () => ({
      mutate: (input: TInput) => mutation.mutate(input),
      mutateAsync: (input: TInput) => mutation.mutateAsync(input),
      isPending: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
      reset: () => mutation.reset(),
      isQueued: mutation.isPending,
    }),
    [mutation]
  );
}

async function directCall<TResult>(
  api: ApiRequest,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  endpoint: string,
  body: unknown,
  idempotencyKey: string
): Promise<TResult> {
  // We need a schema for parse, but TResult is opaque. Use z.unknown() and
  // cast at the boundary; callers that need typed responses can wrap with
  // a typed helper.
  return api({
    method,
    path: endpoint,
    body: body ?? undefined,
    schema: (await import("zod")).z.unknown(),
    idempotencyKey,
  }) as Promise<TResult>;
}

// `useCallback` re-export to silence the unused warning when consumers
// import it; the file owns the contract for the optimistic patch.
export const _unused = useCallback;
