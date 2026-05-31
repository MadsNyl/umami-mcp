import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Database } from "bun:sqlite";
import { env } from "../env.js";
import { encrypt } from "./crypto.js";
import { verifyCodeChallenge } from "./pkce.js";
import { insertSession, insertAuthCode, getAuthCode, deleteAuthCode, getSession } from "../db/queries.js";
import type { UmamiClient } from "../umami/client.js";

const codeToToken = new Map<string, string>();

function getBaseUrl(c: { req: { url: string; header: (name: string) => string | undefined } }): string {
  const url = new URL(c.req.url);
  const proto = c.req.header("x-forwarded-proto") || url.protocol.replace(":", "");
  return `${proto}://${url.host}`;
}

export function createOAuthRoutes(db: Database, umamiClient: UmamiClient): Hono {
  const oauth = new Hono();

  oauth.get("/.well-known/oauth-authorization-server", (c) => {
    const baseUrl = getBaseUrl(c);
    return c.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
    });
  });

  oauth.post("/oauth/register", async (c) => {
    const body = await c.req.json();
    return c.json({
      client_id: env.OAUTH_CLIENT_ID,
      client_name: body.client_name || "MCP Client",
      redirect_uris: body.redirect_uris || [],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }, 201);
  });

  oauth.get("/.well-known/oauth-protected-resource/mcp", (c) => {
    const baseUrl = getBaseUrl(c);
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
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Umami MCP - Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 48px 40px;
      width: 100%;
      max-width: 380px;
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo img {
      height: 40px;
      margin-bottom: 8px;
    }
    .logo .subtitle {
      font-style: italic;
      color: #666;
      font-size: 14px;
    }
    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 6px;
    }
    input[type="text"],
    input[type="password"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 15px;
      margin-bottom: 16px;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus,
    input[type="password"]:focus {
      outline: none;
      border-color: #000;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #000;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.2s;
    }
    button:hover { background: #222; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <img src="https://umami.is/images/umami-logo.png" alt="Umami" />
      <div class="subtitle">MCP Server</div>
    </div>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="redirect_uri" value="${redirectUri}" />
      <input type="hidden" name="client_id" value="${clientId}" />
      <input type="hidden" name="code_challenge" value="${codeChallenge}" />
      <input type="hidden" name="state" value="${state}" />
      <label for="username">Username</label>
      <input type="text" id="username" name="username" required autocomplete="username" />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password" />
      <button type="submit">Sign in</button>
    </form>
  </div>
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
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Umami MCP - Login Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 48px 40px;
      width: 100%;
      max-width: 380px;
      text-align: center;
    }
    .logo {
      margin-bottom: 24px;
    }
    .logo img { height: 40px; margin-bottom: 8px; }
    .logo .subtitle { font-style: italic; color: #666; font-size: 14px; }
    h1 { font-size: 20px; margin-bottom: 8px; color: #333; }
    p { color: #666; margin-bottom: 24px; font-size: 15px; }
    a {
      display: inline-block;
      padding: 10px 24px;
      background: #000;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    a:hover { background: #222; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <img src="https://umami.is/images/umami-logo.png" alt="Umami" />
      <div class="subtitle">MCP Server</div>
    </div>
    <h1>Login Failed</h1>
    <p>Invalid username or password.</p>
    <a href="javascript:history.back()">Try again</a>
  </div>
</body>
</html>`, 401);
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
