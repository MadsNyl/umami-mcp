import { describe, test, expect, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../../src/db/client";
import { insertSession, getSession } from "../../src/db/queries";
import { refreshStaleJwts } from "../../src/jobs/refresh-jwt";

describe("refreshStaleJwts", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initSchema(db);
  });

  test("refreshes session with stale JWT", async () => {
    const now = Date.now();
    const twentyOneHoursAgo = now - 21 * 60 * 60 * 1000;

    insertSession(db, {
      token: "tok_stale",
      umamiUserId: "user-1",
      umamiUsername: "admin",
      encryptedPassword: "enc-pw",
      encryptionIv: "iv-123",
      umamiJwt: "old-jwt",
      jwtRefreshedAt: twentyOneHoursAgo,
      createdAt: now - 86400000,
      expiresAt: now + 86400000 * 89,
    });

    const mockLogin = mock(() =>
      Promise.resolve({ token: "new-jwt", user: { id: "user-1", username: "admin", role: "admin", createdAt: "", isAdmin: true } })
    );
    const mockDecrypt = mock(() => "decrypted-password");

    await refreshStaleJwts(db, 20, mockDecrypt, mockLogin);

    const session = getSession(db, "tok_stale");
    expect(session!.umamiJwt).toBe("new-jwt");
    expect(mockLogin).toHaveBeenCalledWith("admin", "decrypted-password");
  });

  test("skips sessions with fresh JWT", async () => {
    const now = Date.now();

    insertSession(db, {
      token: "tok_fresh",
      umamiUserId: "user-1",
      umamiUsername: "admin",
      encryptedPassword: "enc-pw",
      encryptionIv: "iv-123",
      umamiJwt: "fresh-jwt",
      jwtRefreshedAt: now,
      createdAt: now,
      expiresAt: now + 86400000 * 90,
    });

    const mockLogin = mock(() => Promise.resolve({ token: "unused", user: { id: "", username: "", role: "", createdAt: "", isAdmin: false } }));
    const mockDecrypt = mock(() => "pw");

    await refreshStaleJwts(db, 20, mockDecrypt, mockLogin);

    expect(mockLogin).not.toHaveBeenCalled();
  });
});
