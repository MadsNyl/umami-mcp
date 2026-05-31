import { describe, test, expect } from "bun:test";
import { generateCodeChallenge, verifyCodeChallenge } from "../../src/oauth/pkce";

describe("PKCE S256", () => {
  test("generateCodeChallenge produces base64url string", () => {
    const challenge = generateCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("verifyCodeChallenge returns true for matching verifier", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = generateCodeChallenge(verifier);
    expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
  });

  test("verifyCodeChallenge returns false for wrong verifier", () => {
    const challenge = generateCodeChallenge("correct-verifier");
    expect(verifyCodeChallenge("wrong-verifier", challenge)).toBe(false);
  });
});
