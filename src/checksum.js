const crypto = require("crypto");

/**
 * Nuvei event DMN checksum = SHA256(merchantSecretKey + the raw JSON body exactly as sent).
 *
 * Nuvei's docs say "concatenate all of the parameter values", but their worked example
 * hashes the secret followed by the whole JSON body, and only that reproduces their
 * published checksum (2729122933fb…, verified Oct 2026). The values-only method rejected
 * every real event received Aug–Sep 2026, so it is not used.
 */
function verifyChecksum(rawBody, receivedChecksum, merchantSecretKey) {
  if (!rawBody || !receivedChecksum || !merchantSecretKey) return false;
  const computed = crypto
    .createHash("sha256")
    .update(merchantSecretKey + rawBody, "utf8")
    .digest("hex");
  const expected = String(receivedChecksum).trim().toLowerCase();
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { verifyChecksum };
