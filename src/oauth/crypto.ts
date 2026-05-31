import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encrypt(
  plaintext: string,
  secret: string
): { ciphertext: string; iv: string } {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return {
    ciphertext: encrypted + "." + authTag,
    iv: iv.toString("base64"),
  };
}

export function decrypt(
  ciphertext: string,
  iv: string,
  secret: string
): string {
  const key = deriveKey(secret);
  const ivBuffer = Buffer.from(iv, "base64");
  const [encrypted, authTag] = ciphertext.split(".");

  const decipher = createDecipheriv("aes-256-gcm", key, ivBuffer);
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
