import { Database } from "bun:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  token              TEXT PRIMARY KEY,
  umami_user_id      TEXT NOT NULL,
  umami_username     TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  encryption_iv      TEXT NOT NULL,
  umami_jwt          TEXT NOT NULL,
  jwt_refreshed_at   INTEGER NOT NULL,
  created_at         INTEGER NOT NULL,
  expires_at         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_codes (
  code             TEXT PRIMARY KEY,
  code_challenge   TEXT NOT NULL,
  created_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_codes_expires ON auth_codes(expires_at);
`;

export function initSchema(db: Database): void {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);
}

export function createDb(path: string): Database {
  const db = new Database(path);
  initSchema(db);
  return db;
}
