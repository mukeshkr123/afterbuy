import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { createApi, type ApiRequest } from "./client";
import { useApiBaseUrl } from "../hooks/useApiBaseUrl";

const ApiContext = createContext<ApiRequest | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const baseUrl = useApiBaseUrl();
  const { getToken } = useClerkAuth();
  const api = useMemo<ApiRequest>(
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
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiRequest {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error("useApi must be used inside <ApiProvider>");
  }
  return ctx;
}
