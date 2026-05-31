import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { UmamiClient } from "../../umami/client.js";

export function registerWebsitesTools(
  server: McpServer,
  getJwt: () => string,
  umamiClient: UmamiClient
) {
  server.registerTool(
    "list_websites",
    {
      title: "List Websites",
      description: "List all websites tracked in Umami",
      inputSchema: z.object({
        includeTeams: z.boolean().optional().describe("Include team websites"),
        search: z.string().optional().describe("Search filter"),
        page: z.number().optional().describe("Page number"),
        pageSize: z.number().optional().describe("Number of results per page"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const result = await umamiClient.listWebsites(getJwt(), params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_website",
    {
      title: "Get Website",
      description: "Get details for a specific website by ID",
      inputSchema: z.object({
        websiteId: z.string().describe("The website UUID"),
      }),
    },
    async (params): Promise<CallToolResult> => {
      const result = await umamiClient.getWebsite(getJwt(), params.websiteId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
