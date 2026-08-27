const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms =
    Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso + "T00:00:00Z");
  return Math.round(ms / 86_400_000);
}

// Phase 6 derives returnDeadlineAt from a category default. Server already
// returns this via /v1/meta/categories; we re-derive here for the form's
// optimistic prefill before the categories round-trip resolves.
export function deriveReturnDeadline(
  category: string,
  defaults: Record<string, { defaultReturnDays: number }>,
  today: string = todayIso()
): string | null {
  const def = defaults[category];
  if (!def) return null;
  return addDays(today, def.defaultReturnDays);
}
