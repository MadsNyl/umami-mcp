import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { UmamiClient } from "../../umami/client.js";
import { dateToMs } from "../date.js";

export function registerEventsTools(
  server: McpServer,
  getJwt: () => string,
  umamiClient: UmamiClient
) {
  server.registerTool(
    "list_events",
    {
      title: "List Events",
      description: "List custom events recorded for a website over a time range",
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
      const result = await umamiClient.listEvents(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
        ...rest,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_event_stats",
    {
      title: "Get Event Stats",
      description: "Get aggregate event statistics for a website over a time range",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startAt: z.string().describe("Start date as ISO 8601 string (e.g. '2026-01-15')"),
        endAt: z.string().describe("End date as ISO 8601 string (e.g. '2026-02-15')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, startAt, endAt } = params;
      const result = await umamiClient.getEventStats(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_event_series",
    {
      title: "Get Event Series",
      description: "Get event counts over time (time series) for a website",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startAt: z.string().describe("Start date as ISO 8601 string (e.g. '2026-01-15')"),
        endAt: z.string().describe("End date as ISO 8601 string (e.g. '2026-02-15')"),
        unit: z
          .enum(["minute", "hour", "day", "month", "year"])
          .describe("Time bucket granularity"),
        timezone: z.string().optional().describe("Timezone (e.g. 'America/New_York')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, startAt, endAt, ...rest } = params;
      const result = await umamiClient.getEventSeries(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
        ...rest,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_event_data",
    {
      title: "Get Event Data",
      description: "Get custom event data (event names and counts) for a website",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startAt: z.string().describe("Start date as ISO 8601 string (e.g. '2026-01-15')"),
        endAt: z.string().describe("End date as ISO 8601 string (e.g. '2026-02-15')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, startAt, endAt } = params;
      const result = await umamiClient.getEventDataEvents(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
