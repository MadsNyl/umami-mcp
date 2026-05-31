import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Database } from "bun:sqlite";
import { env } from "../env.js";
import { encrypt } from "./crypto.js";
import { verifyCodeChallenge } from "./pkce.js";
import { insertSession, insertAuthCode, getAuthCode, deleteAuthCode, getSession } from "../db/queries.js";
import type { UmamiClient } from "../umami/client.js";

const codeToToken = new Map<string, string>();

export function createOAuthRoutes(db: Database, umamiClient: UmamiClient): Hono {
  const oauth = new Hono();

  oauth.get("/.well-known/oauth-authorization-server", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
    });
  });

  oauth.get("/.well-known/oauth-protected-resource/mcp", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
    });
  });

  oauth.get("/oauth/authorize", (c) => {
    const redirectUri = c.req.query("redirect_uri") || "";
    const clientId = c.req.query("client_id") || "";
    const codeChallenge = c.req.query("code_challenge") || "";
    const codeChallengeMethod = c.req.query("code_challenge_method") || "";
    const state = c.req.query("state") || "";

    if (codeChallengeMethod && codeChallengeMethod !== "S256") {
      return c.text("Only S256 code_challenge_method is supported", 400);
    }

    return c.html(`<!DOCTYPE html>
<html>
<head><title>Umami MCP - Login</title></head>
<body>
  <h1>Umami MCP Authorization</h1>
  <form method="POST" action="/oauth/authorize">
    <input type="hidden" name="redirect_uri" value="${redirectUri}" />
    <input type="hidden" name="client_id" value="${clientId}" />
    <input type="hidden" name="code_challenge" value="${codeChallenge}" />
    <input type="hidden" name="state" value="${state}" />
    <label>Username: <input type="text" name="username" required /></label><br/>
    <label>Password: <input type="password" name="password" required /></label><br/>
    <button type="submit">Authorize</button>
  </form>
</body>
</html>`);
  });

  oauth.post("/oauth/authorize", async (c) => {
    const body = await c.req.parseBody();
    const username = body["username"] as string;
    const password = body["password"] as string;
    const redirectUri = body["redirect_uri"] as string;
    const clientId = body["client_id"] as string;
    const codeChallenge = body["code_challenge"] as string;
    const state = body["state"] as string;

    if (clientId !== env.OAUTH_CLIENT_ID) {
      return c.text("Invalid client_id", 400);
    }

    if (!codeChallenge) {
      return c.text("code_challenge is required (PKCE S256)", 400);
    }

    let umamiResponse;
    try {
      umamiResponse = await umamiClient.login(username, password);
    } catch {
      return c.html(`<!DOCTYPE html>
<html><body>
  <h1>Login Failed</h1>
  <p>Invalid username or password.</p>
  <a href="javascript:history.back()">Try again</a>
</body></html>`, 401);
    }

    const { ciphertext, iv } = encrypt(password, env.MCP_SECRET);
    const token = nanoid(48);
    const now = Date.now();

    insertSession(db, {
      token,
      umamiUserId: umamiResponse.user.id,
      umamiUsername: umamiResponse.user.username,
      encryptedPassword: ciphertext,
      encryptionIv: iv,
      umamiJwt: umamiResponse.token,
      jwtRefreshedAt: now,
      createdAt: now,
      expiresAt: now + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    const code = nanoid(32);
    insertAuthCode(db, {
      code,
      codeChallenge,
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
    });

    codeToToken.set(code, token);

    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);

    return c.redirect(redirect.toString());
  });

  oauth.post("/oauth/token", async (c) => {
    const body = await c.req.parseBody();
    const grantType = body["grant_type"] as string;
    const code = body["code"] as string;
    const codeVerifier = body["code_verifier"] as string;
    const clientId = body["client_id"] as string;

    if (grantType !== "authorization_code") {
      return c.json({ error: "unsupported_grant_type" }, 400);
    }

    if (clientId !== env.OAUTH_CLIENT_ID) {
      return c.json({ error: "invalid_client" }, 400);
    }

    const authCode = getAuthCode(db, code);
    if (!authCode) {
      return c.json({ error: "invalid_grant", error_description: "Code expired or invalid" }, 400);
    }

    if (!verifyCodeChallenge(codeVerifier, authCode.codeChallenge)) {
      return c.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
    }

    deleteAuthCode(db, code);

    const sessionToken = codeToToken.get(code);
    codeToToken.delete(code);

    if (!sessionToken) {
      return c.json({ error: "invalid_grant", error_description: "No session for code" }, 400);
    }

    const session = getSession(db, sessionToken);
    if (!session) {
      return c.json({ error: "invalid_grant", error_description: "Session expired" }, 400);
    }

    return c.json({
      access_token: sessionToken,
      token_type: "Bearer",
      expires_in: Math.floor((session.expiresAt - Date.now()) / 1000),
    });
  });

  return oauth;
}
