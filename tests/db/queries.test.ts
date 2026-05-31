import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../../src/db/client";
import {
  insertSession,
  getSession,
  updateSessionJwt,
  getStaleJwtSessions,
  deleteExpiredSessions,
  insertAuthCode,
  getAuthCode,
  deleteAuthCode,
  deleteExpiredAuthCodes,
  type SessionRow,
  type AuthCodeRow,
} from "../../src/db/queries";

function makeSession(overrides: Partial<SessionRow> = {}): SessionRow {
  const now = Date.now();
  return {
    token: "tok_abc123",
    umamiUserId: "user-001",
    umamiUsername: "testuser",
    encryptedPassword: "enc_password_data",
    encryptionIv: "iv_data",
    umamiJwt: "jwt.token.value",
    jwtRefreshedAt: now,
    createdAt: now,
    expiresAt: now + 7_776_000_000, // 90 days
    ...overrides,
  };
}

function makeAuthCode(overrides: Partial<AuthCodeRow> = {}): AuthCodeRow {
  const now = Date.now();
  return {
    code: "code_xyz789",
    codeChallenge: "challenge_abc",
    createdAt: now,
    expiresAt: now + 600_000, // 10 minutes
    ...overrides,
  };
}

let db: Database;

beforeEach(() => {
  db = new Database(":memory:");
  initSchema(db);
});

describe("sessions", () => {
  test("insert and retrieve a session round-trip", () => {
    const session = makeSession();
    insertSession(db, session);

    const retrieved = getSession(db, session.token);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.token).toBe(session.token);
    expect(retrieved!.umamiUserId).toBe(session.umamiUserId);
    expect(retrieved!.umamiUsername).toBe(session.umamiUsername);
    expect(retrieved!.encryptedPassword).toBe(session.encryptedPassword);
    expect(retrieved!.encryptionIv).toBe(session.encryptionIv);
    expect(retrieved!.umamiJwt).toBe(session.umamiJwt);
    expect(retrieved!.jwtRefreshedAt).toBe(session.jwtRefreshedAt);
    expect(retrieved!.createdAt).toBe(session.createdAt);
    expect(retrieved!.expiresAt).toBe(session.expiresAt);
  });

  test("getSession returns null for missing token", () => {
    const result = getSession(db, "nonexistent_token");
    expect(result).toBeNull();
  });

  test("getSession returns null for expired token", () => {
    const session = makeSession({ expiresAt: Date.now() - 1000 });
    insertSession(db, session);

    const result = getSession(db, session.token);
    expect(result).toBeNull();
  });

  test("updateSessionJwt updates jwt and jwtRefreshedAt", () => {
    const session = makeSession();
    insertSession(db, session);

    const newJwt = "new.jwt.token";
    const newRefreshedAt = Date.now() + 1000;
    updateSessionJwt(db, session.token, newJwt, newRefreshedAt);

    const retrieved = getSession(db, session.token);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.umamiJwt).toBe(newJwt);
    expect(retrieved!.jwtRefreshedAt).toBe(newRefreshedAt);
  });

  test("getStaleJwtSessions returns only sessions needing refresh", () => {
    const now = Date.now();
    const refreshIntervalHours = 20;
    const thresholdMs = refreshIntervalHours * 60 * 60 * 1000;

    // Fresh session: refreshed recently, should NOT appear
    const freshSession = makeSession({
      token: "fresh_token",
      jwtRefreshedAt: now - 1000, // 1 second ago
    });

    // Stale session: refreshed long ago, SHOULD appear
    const staleSession = makeSession({
      token: "stale_token",
      jwtRefreshedAt: now - thresholdMs - 1000, // older than threshold
    });

    insertSession(db, freshSession);
    insertSession(db, staleSession);

    const stale = getStaleJwtSessions(db, refreshIntervalHours);
    expect(stale.length).toBe(1);
    expect(stale[0].token).toBe("stale_token");
  });

  test("getStaleJwtSessions excludes expired sessions", () => {
    const now = Date.now();
    const refreshIntervalHours = 20;
    const thresholdMs = refreshIntervalHours * 60 * 60 * 1000;

    // Stale but also expired session — should NOT appear
    const expiredStaleSession = makeSession({
      token: "expired_stale_token",
      jwtRefreshedAt: now - thresholdMs - 1000,
      expiresAt: now - 1000, // already expired
    });

    insertSession(db, expiredStaleSession);

    const stale = getStaleJwtSessions(db, refreshIntervalHours);
    expect(stale.length).toBe(0);
  });

  test("deleteExpiredSessions removes expired rows and returns count", () => {
    const now = Date.now();

    const expiredSession1 = makeSession({ token: "expired_1", expiresAt: now - 2000 });
    const expiredSession2 = makeSession({ token: "expired_2", expiresAt: now - 1000 });
    const validSession = makeSession({ token: "valid_1", expiresAt: now + 1_000_000 });

    insertSession(db, expiredSession1);
    insertSession(db, expiredSession2);
    insertSession(db, validSession);

    const deleted = deleteExpiredSessions(db);
    expect(deleted).toBe(2);

    // Valid session should still be retrievable
    const retrieved = getSession(db, "valid_1");
    expect(retrieved).not.toBeNull();

    // Expired sessions should be gone (direct query to bypass expiry check)
    const all = db.query("SELECT token FROM sessions").all() as { token: string }[];
    expect(all.length).toBe(1);
    expect(all[0].token).toBe("valid_1");
  });
});

describe("auth_codes", () => {
  test("insert and retrieve an auth code round-trip", () => {
    const authCode = makeAuthCode();
    insertAuthCode(db, authCode);

    const retrieved = getAuthCode(db, authCode.code);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.code).toBe(authCode.code);
    expect(retrieved!.codeChallenge).toBe(authCode.codeChallenge);
    expect(retrieved!.createdAt).toBe(authCode.createdAt);
    expect(retrieved!.expiresAt).toBe(authCode.expiresAt);
  });

  test("getAuthCode returns null for missing code", () => {
    const result = getAuthCode(db, "nonexistent_code");
    expect(result).toBeNull();
  });

  test("getAuthCode returns null for expired code", () => {
    const authCode = makeAuthCode({ expiresAt: Date.now() - 1000 });
    insertAuthCode(db, authCode);

    const result = getAuthCode(db, authCode.code);
    expect(result).toBeNull();
  });

  test("deleteAuthCode removes the code", () => {
    const authCode = makeAuthCode();
    insertAuthCode(db, authCode);

    deleteAuthCode(db, authCode.code);

    const result = getAuthCode(db, authCode.code);
    expect(result).toBeNull();

    // Confirm it's truly gone from the table
    const all = db.query("SELECT code FROM auth_codes").all() as { code: string }[];
    expect(all.length).toBe(0);
  });

  test("deleteExpiredAuthCodes removes expired rows and returns count", () => {
    const now = Date.now();

    const expired1 = makeAuthCode({ code: "expired_code_1", expiresAt: now - 2000 });
    const expired2 = makeAuthCode({ code: "expired_code_2", expiresAt: now - 1000 });
    const valid = makeAuthCode({ code: "valid_code", expiresAt: now + 600_000 });

    insertAuthCode(db, expired1);
    insertAuthCode(db, expired2);
    insertAuthCode(db, valid);

    const deleted = deleteExpiredAuthCodes(db);
    expect(deleted).toBe(2);

    // Valid code should still be present
    const retrieved = getAuthCode(db, "valid_code");
    expect(retrieved).not.toBeNull();

    const all = db.query("SELECT code FROM auth_codes").all() as { code: string }[];
    expect(all.length).toBe(1);
    expect(all[0].code).toBe("valid_code");
  });
});
