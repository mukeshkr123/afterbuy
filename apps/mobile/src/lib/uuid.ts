// Lightweight RFC 4122 v4 UUID using crypto.getRandomValues. Phase 5 doesn't
// need v7 ordering; the Idempotency-Key contract is "client-generated UUID"
// per API_CONTRACTS §1.4 — v4 is sufficient and avoids a uuid dep.
export function uuidv4(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}` +
    `-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}` +
    `-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  );
}
