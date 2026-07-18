import {
  enqueueExampleJobResponseSchema,
  healthCheckResponseSchema,
  type EnqueueExampleJobResponse,
  type HealthCheckResponse,
} from "@acme/shared";

const apiBaseUrl =
  import.meta.env.VITE_PUBLIC_API_URL ??
  globalThis.__ACME_CONFIG__?.PUBLIC_API_URL ??
  "";

export async function getHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${apiBaseUrl}/health`);
  return healthCheckResponseSchema.parse(await response.json());
}

export async function enqueueExampleJob(
  message: string
): Promise<EnqueueExampleJobResponse> {
  const response = await fetch(`${apiBaseUrl}/jobs/example`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`Queue request failed with ${response.status}`);
  }

  return enqueueExampleJobResponseSchema.parse(await response.json());
}

declare global {
  interface Window {
    __ACME_CONFIG__?: {
      PUBLIC_API_URL?: string;
    };
  }

  var __ACME_CONFIG__: Window["__ACME_CONFIG__"] | undefined;
}
