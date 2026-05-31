import type { Context, Next } from "hono";
import type { Database } from "bun:sqlite";
import { getSession } from "../db/queries.js";
import type { SessionRow } from "../db/queries.js";

declare module "hono" {
  interface ContextVariableMap {
    session: SessionRow;
  }
}

export function createAuthMiddleware(db: Database) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const token = authHeader.slice(7);
    const session = getSession(db, token);

    if (!session) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    c.set("session", session);
    await next();
  };
}
