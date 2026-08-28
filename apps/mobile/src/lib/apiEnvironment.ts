import { storage } from "./storage";
import { QUERY_PERSIST_KEY, queryClient } from "./queryClient";
import { clearOutbox } from "../offline/outboxStore";

const API_ENV_KEY = "app:api-base-url:v1";

export async function resetPersistedApiStateIfBaseUrlChanged(
  nextBaseUrl: string
): Promise<void> {
  const previousBaseUrl = await storage.getItem(API_ENV_KEY);
  if (!previousBaseUrl) {
    await storage.setItem(API_ENV_KEY, nextBaseUrl);
    return;
  }

  if (previousBaseUrl === nextBaseUrl) {
    return;
  }

  queryClient.clear();
  await storage.removeItem(QUERY_PERSIST_KEY);
  await clearOutbox();
  await storage.setItem(API_ENV_KEY, nextBaseUrl);
}
