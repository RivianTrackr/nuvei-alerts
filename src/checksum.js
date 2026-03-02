const crypto = require("crypto");

/**
 * Recursively extract all leaf values from a JSON object in order.
 * Nuvei checksum = SHA256(merchantSecretKey + all values concatenated)
 */
function extractValues(obj) {
  const values = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      values.push(...extractValues(val));
    } else if (val !== null && val !== undefined) {
      values.push(String(val));
    }
  }
  return values;
}

function verifyChecksum(payload, receivedChecksum, merchantSecretKey) {
  const values = extractValues(payload);
  const raw = merchantSecretKey + values.join("");
  const computed = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  return computed === receivedChecksum;
}

module.exports = { verifyChecksum };
