import { ApiError } from "@/api/client";

export interface FormErrorState {
  message: string | null | undefined;
  fields: Record<string, string>;
}

export function fromCaught(e: unknown): FormErrorState {
  if (e instanceof ApiError) {
    return { message: e.message, fields: e.fields ?? {} };
  }
  if (e instanceof Error) {
    return { message: e.message, fields: {} };
  }
  return { message: "Unexpected error", fields: {} };
}
