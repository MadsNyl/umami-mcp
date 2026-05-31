import type { Database } from "bun:sqlite";
import { getStaleJwtSessions, updateSessionJwt } from "../db/queries.js";
import { decrypt } from "../oauth/crypto.js";
import type { UmamiClient } from "../umami/client.js";
import type { UmamiLoginResponse } from "../umami/types.js";

type DecryptFn = (ciphertext: string, iv: string) => string;
type LoginFn = (username: string, password: string) => Promise<UmamiLoginResponse>;

export async function refreshStaleJwts(
  db: Database,
  refreshIntervalHours: number,
  decryptFn?: DecryptFn,
  loginFn?: LoginFn
): Promise<void> {
  const doDecrypt = decryptFn ?? ((ct: string, iv: string) => decrypt(ct, iv, process.env.MCP_SECRET!));
  const doLogin = loginFn ?? (() => { throw new Error("loginFn required"); });

  const staleSessions = getStaleJwtSessions(db, refreshIntervalHours);

  for (const session of staleSessions) {
    try {
      const password = doDecrypt(session.encryptedPassword, session.encryptionIv);
      const result = await doLogin(session.umamiUsername, password);
      updateSessionJwt(db, session.token, result.token, Date.now());
    } catch (err) {
      console.error(
        `[refresh-jwt] Failed to refresh session ${session.token}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
}

export function startRefreshJob(
  db: Database,
  refreshIntervalHours: number,
  umamiClient: UmamiClient,
  secret: string
): ReturnType<typeof setInterval> {
  const decryptFn = (ct: string, iv: string) => decrypt(ct, iv, secret);
  const loginFn = (username: string, password: string) => umamiClient.login(username, password);

  return setInterval(
    () => refreshStaleJwts(db, refreshIntervalHours, decryptFn, loginFn),
    60 * 60 * 1000
  );
}
