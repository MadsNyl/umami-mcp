import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { UmamiClient } from "../../umami/client.js";
import { dateToMs } from "../date.js";

export function registerSessionsTools(
  server: McpServer,
  getJwt: () => string,
  umamiClient: UmamiClient
) {
  server.registerTool(
    "list_sessions",
    {
      title: "List Sessions",
      description: "List sessions for a website over a time range",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startAt: z.string().describe("Start date as ISO 8601 string (e.g. '2026-01-15')"),
        endAt: z.string().describe("End date as ISO 8601 string (e.g. '2026-02-15')"),
        page: z.number().optional().describe("Page number"),
        pageSize: z.number().optional().describe("Number of results per page"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, startAt, endAt, ...rest } = params;
      const result = await umamiClient.listSessions(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
        ...rest,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_session_stats",
    {
      title: "Get Session Stats",
      description: "Get aggregate session statistics for a website over a time range",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startAt: z.string().describe("Start date as ISO 8601 string (e.g. '2026-01-15')"),
        endAt: z.string().describe("End date as ISO 8601 string (e.g. '2026-02-15')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, startAt, endAt } = params;
      const result = await umamiClient.getSessionStats(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
