<p align="center">
  <img src=".github/banner.png" alt="umami-mcp banner" width="100%" />
</p>

# umami-mcp

A standalone MCP (Model Context Protocol) server that exposes your [Umami](https://umami.is) analytics data as tools for AI assistants. Ask questions about your website traffic, events, sessions, and reports in natural language.

## Why?

Umami is a great privacy-focused analytics platform, but querying it requires navigating dashboards or writing API calls manually. This MCP server bridges Umami's REST API into the MCP protocol, letting AI assistants like Claude, Cursor, and VS Code Copilot query your analytics directly.

- Ask "How many visitors did my site get this week?" and get an answer
- Run funnel analysis, retention reports, and UTM breakdowns through conversation
- No modifications to your Umami instance required — read-only access via the REST API

## Features

**16 analytics tools** covering the full Umami v2 API:

| Category | Tools |
|----------|-------|
| Websites | `list_websites`, `get_website` |
| Analytics | `get_stats`, `get_pageviews`, `get_active_visitors`, `get_metrics` |
| Events | `list_events`, `get_event_stats`, `get_event_series`, `get_event_data` |
| Sessions | `list_sessions`, `get_session_stats` |
| Reports | `run_funnel`, `run_retention`, `run_utm_report`, `run_journey` |

**Security:** OAuth 2.0 with PKCE, AES-256-GCM encrypted credentials at rest, 90-day sessions with automatic JWT refresh.

**Lightweight:** Single process, embedded SQLite, no external database dependency.

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- A self-hosted Umami v2 instance with API access
- A Umami user account (username/password)

## Setup

1. **Clone and install:**

```bash
git clone https://github.com/MadsNyl/umami-mcp.git
cd umami-mcp
bun install
```

2. **Configure environment:**

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:

| Variable | Description |
|----------|-------------|
| `UMAMI_URL` | Base URL of your Umami instance (e.g. `https://analytics.example.com`) |
| `MCP_SECRET` | Random 32+ character string for encryption. Generate with: `openssl rand -base64 32` |
| `OAUTH_CLIENT_ID` | Client ID for the OAuth flow (can be any string, e.g. `umami-mcp`) |
| `OAUTH_REDIRECT_URI` | Not used for validation in practice — MCP clients send their own redirect URI |

Optional variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SQLITE_PATH` | `/data/sessions.db` | Path to SQLite database file |
| `SESSION_TTL_DAYS` | `90` | How long sessions last before re-authentication |
| `JWT_REFRESH_INTERVAL_HOURS` | `20` | How often the Umami JWT is refreshed in the background |
| `PORT` | `3000` | HTTP server port |

3. **Run:**

```bash
# Development (with hot reload)
bun run dev

# Production
bun run build
bun run dist/index.js
```

The server starts on port 3000 (configurable via `PORT`).

## Connecting AI Clients

This MCP server uses **Streamable HTTP transport** — it runs as a web server that AI clients connect to over HTTP. The MCP endpoint is at `/mcp`.

### Claude (claude.ai)

Claude supports remote MCP servers natively via Custom Connectors:

1. Open [claude.ai](https://claude.ai) → Settings → Connectors
2. Click "Add custom connector"
3. Enter your server URL (e.g. `https://your-server.example.com/mcp`)
4. Complete the OAuth login when prompted
5. The 16 analytics tools will appear in your conversations

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "umami": {
      "url": "https://your-server.example.com/mcp"
    }
  }
}
```

Config file location:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop after saving. You'll be prompted to authenticate via the OAuth flow.

### Claude Code

```bash
claude mcp add umami --transport http https://your-server.example.com/mcp
```

### Cursor

Add to your Cursor MCP settings (Settings → MCP):

```json
{
  "mcpServers": {
    "umami": {
      "url": "https://your-server.example.com/mcp"
    }
  }
}
```

Cursor supports OAuth authentication automatically. You'll be prompted to log in on first use.

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace (or user settings):

```json
{
  "servers": {
    "umami": {
      "type": "http",
      "url": "https://your-server.example.com/mcp"
    }
  }
}
```

You can also use the Command Palette → "MCP: Add Server" for guided setup.

### Windsurf

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "umami": {
      "url": "https://your-server.example.com/mcp"
    }
  }
}
```

### ChatGPT

ChatGPT supports MCP servers. Add the server URL in the ChatGPT MCP settings when configuring external tools.

### Any MCP Client

Any client that supports the MCP Streamable HTTP transport can connect by pointing to:

```
https://your-server.example.com/mcp
```

The server implements:
- OAuth 2.0 discovery at `/.well-known/oauth-authorization-server`
- Protected resource metadata at `/.well-known/oauth-protected-resource/mcp`
- Standard MCP Streamable HTTP at `/mcp`

## Authentication Flow

When an MCP client connects for the first time:

1. Client discovers the OAuth server via `/.well-known/oauth-authorization-server`
2. User is shown a login form and enters their Umami username/password
3. Server validates credentials against Umami's `/api/auth/login`
4. An opaque 90-day access token is issued to the client
5. All subsequent tool calls use this token — no re-authentication needed

The Umami JWT is refreshed automatically in the background every 20 hours, so your session stays valid for the full 90 days without any interaction.

## Development

```bash
# Run tests
bun test

# Type check
bun run typecheck

# Dev server with hot reload
bun run dev
```

## Deployment

The server is designed to run as a single-instance service with persistent storage for SQLite. See the included `Dockerfile` for container deployment.

Key requirements:
- Persistent storage for SQLite (default path: `/data/sessions.db`, configurable via `SQLITE_PATH`)
- Network access to your Umami instance
- HTTPS termination (via reverse proxy or platform)

### Railway

1. Create a new service in your Railway project using this repo
2. **Add a Volume (required, manual step):** Open the service → Command Palette (`⌘K`) → "Add Volume" → set mount path to `/data`. This cannot be automated via `railway.json` — Railway only supports volume creation through the dashboard or CLI (`railway volume add`).
3. Add the required environment variables (see `.env.example`)
4. Set `UMAMI_URL` to your Umami service's private network URL (e.g. `http://umami.railway.internal:3000`). Note: internal URLs require the port and use `http://`, not `https://`.
5. Deploy — the included `railway.json` handles build config and restart policy automatically

**Why is the volume manual?** Railway's config-as-code (`railway.json`) only covers build and deploy settings. Volume attachment is a platform-level operation that must be done via the dashboard or CLI. Railway rejects the `VOLUME` Dockerfile instruction entirely (build will fail), which is why it's omitted from the Dockerfile. Without this volume, session data will be lost on every redeploy.

### Docker (generic)

The `VOLUME` instruction is omitted from the Dockerfile for Railway compatibility. Use `-v` to mount persistent storage:

```bash
docker build -t umami-mcp .
docker run -d \
  -v umami-mcp-data:/data \
  -p 3000:3000 \
  --env-file .env \
  umami-mcp
```

### Without Docker

```bash
bun run build
SQLITE_PATH=./data/sessions.db bun run dist/index.js
```

Make sure the directory for `SQLITE_PATH` exists and is persisted across restarts.

## Tech Stack

- **Runtime:** Bun
- **HTTP:** Hono
- **MCP:** @modelcontextprotocol/sdk (Streamable HTTP transport)
- **Database:** bun:sqlite (embedded)
- **Validation:** Zod

## License

MIT
