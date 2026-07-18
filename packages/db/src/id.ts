// RFC 9562 §5.7 — 48-bit Unix-ms timestamp + 80 random bits, version 7 nibble,
// variant bits. Time-ordered ids let keyset cursors over `created_at` break
// ties deterministically without relying on a tie-breaker expression.
export function uuidv7(): string {
  const ts = Date.now();
  const rnd = crypto.getRandomValues(new Uint8Array(10));
  const bytes = new Uint8Array(16);
  // timestamp (big-endian)
  bytes[0] = (ts / 2 ** 40) & 0xff;
  bytes[1] = (ts / 2 ** 32) & 0xff;
  bytes[2] = (ts / 2 ** 24) & 0xff;
  bytes[3] = (ts / 2 ** 16) & 0xff;
  bytes[4] = (ts / 2 ** 8) & 0xff;
  bytes[5] = ts & 0xff;
  // version 7
  bytes[6] = 0x70 | (rnd[0]! & 0x0f);
  bytes.set(rnd.subarray(1, 10), 7);
  // variant 10
  bytes[8]! |= 0x80;
  return format(bytes);
}

function format(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}` +
    `-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}` +
    `-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  );
}
