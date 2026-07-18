// Mirrors apps/api/src/routes/claims.ts ALLOWED_TRANSITIONS.
import type { ClaimStatus } from "@acme/shared";

export const ALLOWED_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["in_progress", "cancelled"],
  in_progress: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
  rejected: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function nextStatuses(current: ClaimStatus): ClaimStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export function statusTone(
  status: ClaimStatus
): "neutral" | "accent" | "success" | "warning" | "danger" {
  if (status === "completed" || status === "approved") return "success";
  if (status === "cancelled" || status === "rejected") return "danger";
  if (status === "submitted" || status === "in_progress") return "warning";
  return "neutral";
}
