import {
  meResponseSchema,
  patchMeRequestSchema,
  type MeResponse,
  type PatchMeRequest,
} from "@acme/shared";
import { z } from "zod";
import type { ApiRequest } from "./client";

export function getMe(api: ApiRequest): Promise<MeResponse> {
  return api({
    method: "GET",
    path: "/v1/me",
    schema: meResponseSchema,
  }) as Promise<MeResponse>;
}

export function patchMe(
  api: ApiRequest,
  body: PatchMeRequest
): Promise<MeResponse> {
  patchMeRequestSchema.parse(body);
  return api({
    method: "PATCH",
    path: "/v1/me",
    body,
    schema: meResponseSchema,
  }) as Promise<MeResponse>;
}

export function deleteMe(api: ApiRequest): Promise<void> {
  return api({
    method: "DELETE",
    path: "/v1/me",
    schema: z.void(),
  }) as Promise<void>;
}
