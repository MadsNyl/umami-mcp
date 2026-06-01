import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { UmamiClient } from "../../umami/client.js";
import { dateToMs } from "../date.js";

export function registerStatsTools(
  server: McpServer,
  getJwt: () => string,
  umamiClient: UmamiClient
) {
  server.registerTool(
    "get_stats",
    {
      title: "Get Website Stats",
      description: "Get aggregated stats for a website over a time range",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startAt: z.string().describe("Start date as ISO 8601 string (e.g. '2026-01-15' or '2026-01-15T08:00:00Z')"),
        endAt: z.string().describe("End date as ISO 8601 string (e.g. '2026-02-15' or '2026-02-15T23:59:59Z')"),
        compare: z.string().optional().describe("Comparison period (e.g. 'previous')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, startAt, endAt, ...rest } = params;
      const result = await umamiClient.getStats(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
        ...rest,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_pageviews",
    {
      title: "Get Pageviews",
      description: "Get pageview and session counts over time for a website",
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
      const result = await umamiClient.getPageviews(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
        ...rest,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_active_visitors",
    {
      title: "Get Active Visitors",
      description: "Get the number of currently active visitors on a website",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const result = await umamiClient.getActiveVisitors(getJwt(), params.websiteId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_metrics",
    {
      title: "Get Metrics",
      description:
        "Get ranked metrics for a website (e.g. top pages, browsers, countries, referrers)",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startAt: z.string().describe("Start date as ISO 8601 string (e.g. '2026-01-15')"),
        endAt: z.string().describe("End date as ISO 8601 string (e.g. '2026-02-15')"),
        type: z
          .string()
          .describe(
            "Metric type: 'path', 'entry', 'exit', 'title', 'query', 'referrer', 'channel', 'domain', 'country', 'region', 'city', 'browser', 'os', 'device', 'language', 'screen', 'event', 'hostname', 'tag', 'distinctId'"
          ),
        limit: z.number().optional().describe("Maximum number of results"),
        offset: z.number().optional().describe("Offset for pagination"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, startAt, endAt, ...rest } = params;
      const result = await umamiClient.getMetrics(getJwt(), websiteId, {
        startAt: dateToMs(startAt),
        endAt: dateToMs(endAt),
        ...rest,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
