import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { UmamiClient } from "../../umami/client.js";

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
        startAt: z.number().describe("Start of time range in milliseconds (Unix timestamp)"),
        endAt: z.number().describe("End of time range in milliseconds (Unix timestamp)"),
        compare: z.string().optional().describe("Comparison period (e.g. 'previous')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, ...rest } = params;
      const result = await umamiClient.getStats(getJwt(), websiteId, rest);
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
        startAt: z.number().describe("Start of time range in milliseconds"),
        endAt: z.number().describe("End of time range in milliseconds"),
        unit: z
          .enum(["minute", "hour", "day", "month", "year"])
          .describe("Time bucket granularity"),
        timezone: z.string().optional().describe("Timezone (e.g. 'America/New_York')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const { websiteId, ...rest } = params;
      const result = await umamiClient.getPageviews(getJwt(), websiteId, rest);
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
        startAt: z.number().describe("Start of time range in milliseconds"),
        endAt: z.number().describe("End of time range in milliseconds"),
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
      const { websiteId, ...rest } = params;
      const result = await umamiClient.getMetrics(getJwt(), websiteId, rest);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
