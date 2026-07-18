import {
  meResponseSchema,
  patchMeRequestSchema,
  type MeResponse,
  type PatchMeRequest,
} from "@acme/shared";
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
