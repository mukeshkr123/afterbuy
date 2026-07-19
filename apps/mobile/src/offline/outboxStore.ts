// AsyncStorage-backed store for the mutation outbox. Single key holding the
// entire queue as JSON; on the order of a few hundred bytes for human-scale
// usage. No partial writes, no diffing — load all, save all.
//
// Persisting in one entry keeps the model simple: one read on hydrate, one
// write on any mutation. If we ever ship at a scale where this is a problem
// we can shard by date prefix; we are far from that.
import { storage } from "../lib/storage";
import type { OutboxEntry } from "./outbox";

const STORAGE_KEY = "outbox:v1";

export async function loadOutbox(): Promise<OutboxEntry[]> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOutboxEntry);
  } catch {
    return [];
  }
}

export async function saveOutbox(entries: OutboxEntry[]): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function clearOutbox(): Promise<void> {
  await storage.removeItem(STORAGE_KEY);
}

function isOutboxEntry(value: unknown): value is OutboxEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["idempotencyKey"] === "string" &&
    typeof v["endpoint"] === "string" &&
    typeof v["method"] === "string" &&
    typeof v["enqueuedAt"] === "number" &&
    typeof v["attempts"] === "number" &&
    typeof v["status"] === "string" &&
    typeof v["label"] === "string"
  );
}
