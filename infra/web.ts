import { COMPATIBILITY_DATE, optionalEnv } from "./env";

interface WebArgs {
  apiUrl: string | undefined;
}

export function createWeb({ apiUrl }: WebArgs) {
  return new sst.cloudflare.Worker("WebWorker", {
    handler: "apps/web/src/worker.ts",
    url: true,
    assets: {
      // SST registers the ASSETS binding only when its top-level assets prop is
      // used; the Worker serves through env.ASSETS explicitly.
      directory: "apps/web/dist/client",
    },
    environment: {
      PUBLIC_API_URL: apiUrl ?? optionalEnv("PUBLIC_API_URL"),
    },
    transform: {
      worker(args) {
        args.compatibilityDate = COMPATIBILITY_DATE;
        args.compatibilityFlags = ["nodejs_compat"];
        args.assets = {
          ...args.assets,
          config: {
            ...args.assets?.config,
            notFoundHandling: "single-page-application",
          },
        };
        args.observability = {
          enabled: true,
          headSamplingRate: 1,
        };
      },
    },
  });
}

export type WebResources = ReturnType<typeof createWeb>;
