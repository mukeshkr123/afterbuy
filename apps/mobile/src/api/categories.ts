import {
  categoryMetaListResponseSchema,
  type CategoryMetaListResponse,
} from "@acme/shared";
import type { ApiRequest } from "./client";

export function getCategories(
  api: ApiRequest
): Promise<CategoryMetaListResponse> {
  return api({
    method: "GET",
    path: "/v1/meta/categories",
    schema: categoryMetaListResponseSchema,
  }) as Promise<CategoryMetaListResponse>;
}
