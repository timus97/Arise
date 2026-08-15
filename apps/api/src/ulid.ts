const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Crockford Base32 ULID (26 chars). Application row ids are text ULIDs. */
export function newUlid(nowMs = Date.now()): string {
  let time = BigInt(nowMs);
  const timeChars: string[] = new Array(10);
  for (let i = 9; i >= 0; i--) {
    timeChars[i] = ENCODING[Number(time & 31n)] ?? "0";
    time >>= 5n;
  }

  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let rand = 0n;
  for (const b of bytes) {
    rand = (rand << 8n) | BigInt(b);
  }
  const randChars: string[] = new Array(16);
  for (let i = 15; i >= 0; i--) {
    randChars[i] = ENCODING[Number(rand & 31n)] ?? "0";
    rand >>= 5n;
  }

  return timeChars.join("") + randChars.join("");
}
