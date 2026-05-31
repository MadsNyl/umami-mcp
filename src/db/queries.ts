import type { Database } from "bun:sqlite";

export interface SessionRow {
  token: string;
  umamiUserId: string;
  umamiUsername: string;
  encryptedPassword: string;
  encryptionIv: string;
  umamiJwt: string;
  jwtRefreshedAt: number;
  createdAt: number;
  expiresAt: number;
}

export interface AuthCodeRow {
  code: string;
  codeChallenge: string;
  createdAt: number;
  expiresAt: number;
}

export function insertSession(db: Database, session: SessionRow): void {
  db.run(
    `INSERT INTO sessions (token, umami_user_id, umami_username, encrypted_password, encryption_iv, umami_jwt, jwt_refreshed_at, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.token,
      session.umamiUserId,
      session.umamiUsername,
      session.encryptedPassword,
      session.encryptionIv,
      session.umamiJwt,
      session.jwtRefreshedAt,
      session.createdAt,
      session.expiresAt,
    ]
  );
}

export function getSession(db: Database, token: string): SessionRow | null {
  const row = db
    .query(
      `SELECT token, umami_user_id, umami_username, encrypted_password, encryption_iv, umami_jwt, jwt_refreshed_at, created_at, expires_at
       FROM sessions WHERE token = ? AND expires_at > ?`
    )
    .get(token, Date.now()) as Record<string, unknown> | null;

  if (!row) return null;

  return {
    token: row.token as string,
    umamiUserId: row.umami_user_id as string,
    umamiUsername: row.umami_username as string,
    encryptedPassword: row.encrypted_password as string,
    encryptionIv: row.encryption_iv as string,
    umamiJwt: row.umami_jwt as string,
    jwtRefreshedAt: row.jwt_refreshed_at as number,
    createdAt: row.created_at as number,
    expiresAt: row.expires_at as number,
  };
}

export function updateSessionJwt(
  db: Database,
  token: string,
  newJwt: string,
  refreshedAt: number
): void {
  db.run(
    `UPDATE sessions SET umami_jwt = ?, jwt_refreshed_at = ? WHERE token = ?`,
    [newJwt, refreshedAt, token]
  );
}

export function getStaleJwtSessions(
  db: Database,
  refreshIntervalHours: number
): SessionRow[] {
  const threshold = Date.now() - refreshIntervalHours * 60 * 60 * 1000;
  const rows = db
    .query(
      `SELECT token, umami_user_id, umami_username, encrypted_password, encryption_iv, umami_jwt, jwt_refreshed_at, created_at, expires_at
       FROM sessions WHERE jwt_refreshed_at < ? AND expires_at > ?`
    )
    .all(threshold, Date.now()) as Record<string, unknown>[];

  return rows.map((row) => ({
    token: row.token as string,
    umamiUserId: row.umami_user_id as string,
    umamiUsername: row.umami_username as string,
    encryptedPassword: row.encrypted_password as string,
    encryptionIv: row.encryption_iv as string,
    umamiJwt: row.umami_jwt as string,
    jwtRefreshedAt: row.jwt_refreshed_at as number,
    createdAt: row.created_at as number,
    expiresAt: row.expires_at as number,
  }));
}

export function deleteExpiredSessions(db: Database): number {
  const result = db.run(
    `DELETE FROM sessions WHERE expires_at < ?`,
    [Date.now()]
  );
  return result.changes;
}

export function insertAuthCode(db: Database, authCode: AuthCodeRow): void {
  db.run(
    `INSERT INTO auth_codes (code, code_challenge, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
    [authCode.code, authCode.codeChallenge, authCode.createdAt, authCode.expiresAt]
  );
}

export function getAuthCode(db: Database, code: string): AuthCodeRow | null {
  const row = db
    .query(
      `SELECT code, code_challenge, created_at, expires_at
       FROM auth_codes WHERE code = ? AND expires_at > ?`
    )
    .get(code, Date.now()) as Record<string, unknown> | null;

  if (!row) return null;

  return {
    code: row.code as string,
    codeChallenge: row.code_challenge as string,
    createdAt: row.created_at as number,
    expiresAt: row.expires_at as number,
  };
}

export function deleteAuthCode(db: Database, code: string): void {
  db.run(`DELETE FROM auth_codes WHERE code = ?`, [code]);
}

export function deleteExpiredAuthCodes(db: Database): number {
  const result = db.run(
    `DELETE FROM auth_codes WHERE expires_at < ?`,
    [Date.now()]
  );
  return result.changes;
}
