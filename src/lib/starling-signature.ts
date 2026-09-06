import crypto from "node:crypto";

// Starling signs webhooks as: X-Hook-Signature = Base64(SHA-512(sharedSecret + rawBody)).
// Must be computed over the raw request bytes and compared in constant time.
export function verifyStarlingSignature(
  rawBody: string,
  headerSignature: string | null
): boolean {
  const secret = process.env.STARLING_WEBHOOK_SECRET;
  if (!secret || !headerSignature) return false;

  const expected = crypto
    .createHash("sha512")
    .update(secret + rawBody)
    .digest("base64");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(headerSignature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
