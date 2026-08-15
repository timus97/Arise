import { z } from "zod";

/** Crockford Base32 ULID (26 chars). Application row ids are text ULIDs. */
export const Ulid = z
  .string()
  .regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "expected ULID");

export type Ulid = z.infer<typeof Ulid>;

/** Non-empty text id (ULID or Better Auth user id). */
export const TextId = z.string().min(1);

export type TextId = z.infer<typeof TextId>;
