import type { Database } from "bun:sqlite";
import { deleteExpiredSessions, deleteExpiredAuthCodes } from "../db/queries.js";

export function runCleanup(db: Database): { sessions: number; authCodes: number } {
  const sessions = deleteExpiredSessions(db);
  const authCodes = deleteExpiredAuthCodes(db);
  if (sessions > 0 || authCodes > 0) {
    console.log(`[cleanup] Purged ${sessions} sessions, ${authCodes} auth codes`);
  }
  return { sessions, authCodes };
}

export function startCleanupJob(db: Database): ReturnType<typeof setInterval> {
  return setInterval(() => runCleanup(db), 24 * 60 * 60 * 1000);
}
