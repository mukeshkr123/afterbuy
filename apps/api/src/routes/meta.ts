import { createRoute } from "@hono/zod-openapi";
import {
  CATEGORY_DEFAULT_WINDOWS,
  PURCHASE_CATEGORIES,
  apiErrorResponseSchema,
  categoryMetaListResponseSchema,
} from "@acme/shared";
import type { AuthedContext } from "../auth";

const TAG = "Meta";

export const metaCategoriesRoute = createRoute({
  method: "get",
  path: "/v1/meta/categories",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Category list with default warranty and return windows.",
      content: {
        "application/json": { schema: categoryMetaListResponseSchema },
      },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export async function handleCategories(ctx: AuthedContext) {
  const items = PURCHASE_CATEGORIES.map((category) => ({
    category,
    ...CATEGORY_DEFAULT_WINDOWS[category],
  }));
  const body = categoryMetaListResponseSchema.parse({ items });
  return ctx.json(body, 200);
}
