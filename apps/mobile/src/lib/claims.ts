// Mirrors apps/api/src/routes/claims.ts ALLOWED_TRANSITIONS.
import type { ClaimStatus, ClaimType } from "@acme/shared";

/** Human labels for the wire enums. Screens must not render raw enum values. */
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_progress: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  warranty: "Warranty claim",
  return: "Return request",
  refund: "Refund request",
};

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
