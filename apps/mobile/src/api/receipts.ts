import { receiptSchema, type Receipt } from "@acme/shared";
import type { ApiRequest } from "./client";

export type { Receipt };

export interface ReceiptUpload {
  /** Local file URI from expo-image-picker. */
  uri: string;
  /** MIME type, e.g. "image/jpeg". */
  contentType: string;
  /** Filename sent in the multipart part. */
  name: string;
}

/**
 * POST /v1/purchases/{id}/receipts (multipart).
 *
 * React Native's FormData accepts a `{ uri, name, type }` object in place of a
 * Blob and streams the file itself, so the image is never read into JS memory.
 * The cast is required because the DOM lib types `append` as Blob-only.
 */
export function uploadReceipt(
  api: ApiRequest,
  purchaseId: string,
  file: ReceiptUpload
): Promise<Receipt> {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.contentType,
  } as unknown as Blob);

  return api({
    method: "POST",
    path: `/v1/purchases/${encodeURIComponent(purchaseId)}/receipts`,
    body: form,
    bodyKind: "multipart",
    schema: receiptSchema,
  }) as Promise<Receipt>;
}

export function deleteReceipt(api: ApiRequest, id: string): Promise<void> {
  return api({
    method: "DELETE",
    path: `/v1/receipts/${encodeURIComponent(id)}`,
    schema: receiptSchema.optional(),
  }) as Promise<void>;
}
