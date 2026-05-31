import { createHash } from "node:crypto";

export function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

export function verifyCodeChallenge(
  verifier: string,
  challenge: string
): boolean {
  const computed = generateCodeChallenge(verifier);
  return computed === challenge;
}
