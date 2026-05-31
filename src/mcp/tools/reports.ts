import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { UmamiClient } from "../../umami/client.js";

export function registerReportsTools(
  server: McpServer,
  getJwt: () => string,
  umamiClient: UmamiClient
) {
  server.registerTool(
    "run_funnel",
    {
      title: "Run Funnel Report",
      description: "Run a funnel analysis to measure conversion through a sequence of steps",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startDate: z.string().describe("Start date (ISO 8601, e.g. '2024-01-01')"),
        endDate: z.string().describe("End date (ISO 8601, e.g. '2024-01-31')"),
        steps: z
          .array(
            z.object({
              type: z.string().describe("Step type (e.g. 'url', 'event')"),
              value: z.string().describe("Step value (e.g. '/checkout', 'purchase')"),
            })
          )
          .min(2)
          .describe("Funnel steps (minimum 2)"),
        window: z
          .number()
          .optional()
          .describe("Conversion window in minutes"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const result = await umamiClient.runFunnel(getJwt(), params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "run_retention",
    {
      title: "Run Retention Report",
      description: "Run a cohort retention report to measure how users return over time",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startDate: z.string().describe("Start date (ISO 8601, e.g. '2024-01-01')"),
        endDate: z.string().describe("End date (ISO 8601, e.g. '2024-01-31')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const result = await umamiClient.runRetention(getJwt(), params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "run_utm_report",
    {
      title: "Run UTM Report",
      description: "Run a UTM parameter report to analyze traffic sources and campaigns",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startDate: z.string().describe("Start date (ISO 8601, e.g. '2024-01-01')"),
        endDate: z.string().describe("End date (ISO 8601, e.g. '2024-01-31')"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const result = await umamiClient.runUtmReport(getJwt(), params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "run_journey",
    {
      title: "Run Journey Report",
      description: "Run a user journey report to visualize navigation paths through the site",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
        startDate: z.string().describe("Start date (ISO 8601, e.g. '2024-01-01')"),
        endDate: z.string().describe("End date (ISO 8601, e.g. '2024-01-31')"),
        steps: z
          .number()
          .min(3)
          .max(7)
          .optional()
          .describe("Number of journey steps to include (3–7)"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const result = await umamiClient.runJourney(getJwt(), params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
