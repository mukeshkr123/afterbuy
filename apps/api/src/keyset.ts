// Opaque base64url-encoded JSON cursor used by purchases keyset pagination.
// The shape is closed and discriminated by `kind`, matching the sort order
// in effect when the cursor was issued. Cursors from one sort key must not
// be replayed against another — `decodeCursor` returns null in that case so
// the caller can fall back to the first page.

export type Cursor =
  | { kind: "created"; c: string; i: string }
  | { kind: "date"; d: string; i: string }
  | { kind: "amount"; a: number; i: string };

export type CursorKind = Cursor["kind"];

export function encodeCursor(cursor: Cursor): string {
  const json = JSON.stringify(cursor);
  const b64 =
    typeof btoa === "function"
      ? btoa(json)
      : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (
      obj.kind === "created" &&
      typeof obj.c === "string" &&
      typeof obj.i === "string"
    ) {
      return { kind: "created", c: obj.c, i: obj.i };
    }
    if (
      obj.kind === "date" &&
      typeof obj.d === "string" &&
      typeof obj.i === "string"
    ) {
      return { kind: "date", d: obj.d, i: obj.i };
    }
    if (
      obj.kind === "amount" &&
      typeof obj.a === "number" &&
      typeof obj.i === "string"
    ) {
      return { kind: "amount", a: obj.a, i: obj.i };
    }
    return null;
  } catch {
    return null;
  }
}
