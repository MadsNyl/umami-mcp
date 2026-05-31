import { describe, test, expect } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerWebsitesTools } from "../../src/mcp/tools/websites";
import { registerStatsTools } from "../../src/mcp/tools/stats";
import { registerEventsTools } from "../../src/mcp/tools/events";
import { registerSessionsTools } from "../../src/mcp/tools/sessions";
import { registerReportsTools } from "../../src/mcp/tools/reports";
import { createUmamiClient } from "../../src/umami/client";

describe("MCP tool registration", () => {
  test("all 16 tools register without error", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const getJwt = () => "test-jwt";
    const client = createUmamiClient("http://localhost:9999");

    expect(() => {
      registerWebsitesTools(server, getJwt, client);
      registerStatsTools(server, getJwt, client);
      registerEventsTools(server, getJwt, client);
      registerSessionsTools(server, getJwt, client);
      registerReportsTools(server, getJwt, client);
    }).not.toThrow();
  });
});
