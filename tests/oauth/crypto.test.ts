import { describe, test, expect } from "bun:test";
import { encrypt, decrypt } from "../../src/oauth/crypto";

describe("AES-256-GCM crypto", () => {
  const secret = "a".repeat(32);

  test("encrypt returns ciphertext and iv", () => {
    const result = encrypt("my-password", secret);
    expect(result.ciphertext).toBeTruthy();
    expect(result.iv).toBeTruthy();
    expect(result.ciphertext).not.toBe("my-password");
  });

  test("decrypt recovers original plaintext", () => {
    const { ciphertext, iv } = encrypt("hunter2", secret);
    const plaintext = decrypt(ciphertext, iv, secret);
    expect(plaintext).toBe("hunter2");
  });

  test("decrypt with wrong secret throws", () => {
    const { ciphertext, iv } = encrypt("secret-data", secret);
    const wrongSecret = "b".repeat(32);
    expect(() => decrypt(ciphertext, iv, wrongSecret)).toThrow();
  });

  test("each encryption produces unique iv", () => {
    const r1 = encrypt("same-input", secret);
    const r2 = encrypt("same-input", secret);
    expect(r1.iv).not.toBe(r2.iv);
    expect(r1.ciphertext).not.toBe(r2.ciphertext);
  });
});
