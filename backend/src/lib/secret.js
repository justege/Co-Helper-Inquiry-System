import crypto from "crypto";

function keyBuffer() {
  const secret =
    process.env.APP_SECRET ||
    process.env.STORAGE_SECRET ||
    process.env.EMAIL_SECRET ||
    "co-helper-dev-email-secret";
  return crypto.createHash("sha256").update(String(secret)).digest();
}

/** AES-256-GCM. Returns `iv:tag:cipher` hex. */
export function encryptSecret(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(packed) {
  if (!packed) return null;
  const [ivHex, tagHex, dataHex] = String(packed).split(":");
  if (!ivHex || !tagHex || !dataHex) return null;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyBuffer(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const out = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return out.toString("utf8");
}
