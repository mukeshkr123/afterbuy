import { z } from "zod";
import type { ApiRequest } from "./client";

export const deviceSchema = z.object({
  id: z.string(),
  expoPushToken: z.string(),
  platform: z.enum(["ios", "android"]),
  appVersion: z.string(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
});
export type Device = z.infer<typeof deviceSchema>;

export function registerDevice(
  api: ApiRequest,
  body: {
    expoPushToken: string;
    platform: "ios" | "android";
    appVersion: string;
  }
): Promise<Device> {
  return api({
    method: "POST",
    path: "/v1/devices",
    body,
    schema: deviceSchema,
  }) as Promise<Device>;
}

export function unregisterDevice(api: ApiRequest, id: string): Promise<void> {
  return api({
    method: "DELETE",
    path: `/v1/devices/${encodeURIComponent(id)}`,
    schema: z.void(),
  }) as Promise<void>;
}
