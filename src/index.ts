import { Hono } from "hono";
import { cors } from "hono/cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { env } from "./env.js";
import { createDb } from "./db/client.js";
import { createOAuthRoutes } from "./oauth/routes.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createUmamiClient } from "./umami/client.js";
import { startRefreshJob } from "./jobs/refresh-jwt.js";
import { startCleanupJob, runCleanup } from "./jobs/cleanup.js";
import { registerWebsitesTools } from "./mcp/tools/websites.js";
import { registerStatsTools } from "./mcp/tools/stats.js";
import { registerEventsTools } from "./mcp/tools/events.js";
import { registerSessionsTools } from "./mcp/tools/sessions.js";
import { registerReportsTools } from "./mcp/tools/reports.js";

const db = createDb(env.SQLITE_PATH);
const umamiClient = createUmamiClient(env.UMAMI_URL);

runCleanup(db);
startRefreshJob(db, env.JWT_REFRESH_INTERVAL_HOURS, umamiClient, env.MCP_SECRET);
startCleanupJob(db);

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "mcp-session-id",
      "Last-Event-ID",
      "mcp-protocol-version",
    ],
    exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/", createOAuthRoutes(db, umamiClient));

const authMiddleware = createAuthMiddleware(db);

app.all("/mcp", authMiddleware, async (c) => {
  const session = c.get("session");
  const server = new McpServer({ name: "umami-mcp", version: "0.1.0" });
  const getJwt = () => session.umamiJwt;

  registerWebsitesTools(server, getJwt, umamiClient);
  registerStatsTools(server, getJwt, umamiClient);
  registerEventsTools(server, getJwt, umamiClient);
  registerSessionsTools(server, getJwt, umamiClient);
  registerReportsTools(server, getJwt, umamiClient);

  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

console.log(`Umami MCP server starting on port ${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
