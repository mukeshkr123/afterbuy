import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });

export const platformSchema = z.enum(["ios", "android"]);

export const deviceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expoPushToken: z.string(),
  platform: platformSchema,
  lastSeenAt: isoDateTime,
  createdAt: isoDateTime,
});

export type Device = z.infer<typeof deviceSchema>;

export const registerDeviceRequestSchema = z.object({
  expoPushToken: z.string().min(1),
  platform: platformSchema,
});

export type RegisterDeviceRequest = z.infer<typeof registerDeviceRequestSchema>;
