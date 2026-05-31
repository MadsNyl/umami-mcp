# Umami MCP Server — Design Spec

## Overview

A standalone MCP server that exposes Umami analytics data as tools consumable by AI assistants (Claude, Cursor, etc.). Runs as a separate Railway service alongside the existing Umami deployment, communicates exclusively via Umami's v2 REST API, and requires zero modifications to Umami.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun | Native SQLite, fast startup, simple Dockerfile |
| HTTP framework | Hono (on Bun) | Ergonomic routing/middleware, no adapter needed |
| MCP transport | Streamable HTTP | Current MCP standard, supersedes legacy SSE |
| MCP protocol | `@modelcontextprotocol/sdk` | Handles transport, auth helpers, tool dispatch |
| Database | `bun:sqlite` | Embedded, synchronous, zero native deps |
| Validation | Zod | Runtime validation on all Umami responses + tool inputs |
| Auth approach | MCP SDK auth helpers + custom session logic | SDK handles OAuth plumbing; we bridge Umami credentials |
| Umami API | v2 (latest Docker image) | Target: `umamisoftware/umami` from Docker Hub |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Railway Project                         │
│                                                               │
│  ┌─────────────────┐        ┌──────────────────────────────┐ │
│  │   umami          │◄──────│   umami-mcp                  │ │
│  │  (unchanged)     │  REST │   Bun + Hono                 │ │
│  │  Next.js + PG    │  API  │                              │ │
│  └─────────────────┘        │  ┌────────────────────────┐  │ │
│                              │  │  bun:sqlite            │  │ │
│                              │  │  /data/sessions.db     │  │ │
│                              │  └────────────────────────┘  │ │
│                              └──────────────────────────────┘ │
│                                             ▲                 │
│                                             │ MCP (Streamable │
│                                             │      HTTP)      │
└─────────────────────────────────────────────┼─────────────────┘
                                              │
                                         AI Assistants
                                      (Claude, Cursor, etc.)
```

---

## Authentication

### Flow

The MCP SDK's auth helpers manage the OAuth 2.0 authorization code flow with PKCE. We provide the backing logic that bridges Umami's username/password auth.

1. MCP client initiates OAuth authorization code flow (with PKCE)
2. Server renders a login form at the authorize endpoint
3. User submits Umami credentials → server calls `POST /api/auth/login` on Umami
4. If valid: encrypt password, store session in SQLite, issue auth code (5-min TTL)
5. Client exchanges code + verifier → server returns a 90-day opaque access token
6. All MCP tool calls use that token → session lookup → proxy to Umami with live JWT

### Token Lifecycle

| Token | TTL | Storage |
|-------|-----|---------|
| Auth code | 5 minutes | SQLite `auth_codes` — single-use, deleted on exchange |
| MCP access token | 90 days | SQLite `sessions` — opaque, maps to live Umami JWT |
| Umami JWT | ~24h | SQLite `sessions.umami_jwt` — refreshed every 20h |

### Credential Encryption

- Algorithm: AES-256-GCM
- Key: `SHA-256(MCP_SECRET)` — deterministic, derived from env var
- Unique random IV per session, stored alongside ciphertext
- Decryption only in JWT refresh job — never exposed to MCP clients
- Changing `MCP_SECRET` invalidates all sessions

---

## Session Storage — SQLite

File: `/data/sessions.db` on a Railway Volume. Entirely separate from Umami's Postgres.

### Schema

```sql
CREATE TABLE IF NOT EXISTS sessions (
  token              TEXT PRIMARY KEY,
  umami_user_id      TEXT NOT NULL,
  umami_username     TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  encryption_iv      TEXT NOT NULL,
  umami_jwt          TEXT NOT NULL,
  jwt_refreshed_at   INTEGER NOT NULL,
  created_at         INTEGER NOT NULL,
  expires_at         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_codes (
  code             TEXT PRIMARY KEY,
  code_challenge   TEXT NOT NULL,
  created_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_codes_expires ON auth_codes(expires_at);
```

Schema auto-created on boot via `db.exec()`.

---

## Background Jobs

| Job | Interval | Logic |
|-----|----------|-------|
| JWT refresh | 1 hour | Select sessions where `jwt_refreshed_at < now - 20h` and `expires_at > now`. Decrypt password, POST `/api/auth/login`, update JWT. |
| Cleanup | 24 hours | `DELETE FROM sessions WHERE expires_at < now`. Same for `auth_codes`. |

---

## MCP Tools

All tools proxy to Umami v2 REST API. Inputs validated with Zod. Responses parsed through Zod schemas.

### Website Management

| Tool | Umami Endpoint |
|------|----------------|
| `list_websites` | `GET /api/websites` |
| `get_website` | `GET /api/websites/:id` |

### Core Analytics

| Tool | Umami Endpoint |
|------|----------------|
| `get_stats` | `GET /api/websites/:id/stats` |
| `get_pageviews` | `GET /api/websites/:id/pageviews` |
| `get_active_visitors` | `GET /api/websites/:id/active` |
| `get_metrics` | `GET /api/websites/:id/metrics` |

### Events

| Tool | Umami Endpoint |
|------|----------------|
| `list_events` | `GET /api/websites/:id/events` |
| `get_event_stats` | `GET /api/websites/:id/events/stats` |
| `get_event_series` | `GET /api/websites/:id/events/series` |
| `get_event_data` | `GET /api/websites/:id/event-data/events` |

### Sessions

| Tool | Umami Endpoint |
|------|----------------|
| `list_sessions` | `GET /api/websites/:id/sessions` |
| `get_session_stats` | `GET /api/websites/:id/sessions/stats` |

### Reports

| Tool | Umami Endpoint |
|------|----------------|
| `run_funnel` | `POST /api/reports/funnel` |
| `run_retention` | `POST /api/reports/retention` |
| `run_utm_report` | `POST /api/reports/utm` |
| `run_journey` | `POST /api/reports/journey` |

### Common Filters (optional query params)

`path`, `referrer`, `browser`, `os`, `device`, `country`, `region`, `city`, `utmSource`, `utmMedium`, `utmCampaign`

---

## Project Structure

```
umami-mcp/
├── src/
│   ├── index.ts              # Hono app, route mounting, background job scheduling
│   ├── db/
│   │   ├── client.ts         # bun:sqlite instance, schema init on boot
│   │   └── queries.ts        # Typed query helpers
│   ├── oauth/
│   │   ├── routes.ts         # Login form + authorize/token handler logic
│   │   ├── crypto.ts         # AES-256-GCM encrypt/decrypt
│   │   └── pkce.ts           # PKCE S256 helpers
│   ├── jobs/
│   │   ├── refresh-jwt.ts    # Hourly: re-login stale sessions
│   │   └── cleanup.ts        # Daily: purge expired rows
│   ├── mcp/
│   │   ├── server.ts         # MCP server instance, tool registration
│   │   └── tools/
│   │       ├── websites.ts
│   │       ├── stats.ts
│   │       ├── events.ts
│   │       ├── sessions.ts
│   │       └── reports.ts
│   ├── umami/
│   │   ├── client.ts         # Typed fetch wrapper for Umami REST API
│   │   └── types.ts          # Zod schemas for Umami API responses
│   └── middleware/
│       └── auth.ts           # Bearer token → SQLite session lookup + expiry check
├── Dockerfile
├── railway.json
├── package.json
└── tsconfig.json
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `UMAMI_URL` | Yes | — | Base URL of Umami instance |
| `MCP_SECRET` | Yes | — | 32+ char string — derives AES key + signs tokens |
| `OAUTH_CLIENT_ID` | Yes | — | Client ID for MCP OAuth flow |
| `OAUTH_REDIRECT_URI` | Yes | — | Allowed redirect URI |
| `SQLITE_PATH` | No | `/data/sessions.db` | Path to SQLite file |
| `SESSION_TTL_DAYS` | No | `90` | MCP session lifetime |
| `JWT_REFRESH_INTERVAL_HOURS` | No | `20` | Umami JWT refresh threshold |
| `PORT` | No | `3000` | Server port |

---

## Deployment

**Railway setup:**
- Separate service in same project as Umami
- Volume mounted at `/data` for SQLite persistence
- `UMAMI_URL` uses Railway private network (`http://umami.railway.internal`)
- Health check: `GET /health`

**Dockerfile:**

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
VOLUME ["/data"]
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

**`railway.json`:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "DOCKERFILE" },
  "deploy": {
    "startCommand": "bun run dist/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

---

## Security

- PKCE (S256) mandatory — no plain auth code grants
- Auth codes single-use, 5-minute expiry
- Passwords encrypted with AES-256-GCM at rest — never stored plaintext
- MCP access tokens are opaque random strings (not JWTs)
- All MCP endpoints enforce Bearer token + session lookup
- `UMAMI_URL` uses private network — no public egress
- SQLite accessible only within Railway Volume

---

## Out of Scope (v1)

- Horizontal scaling (SQLite is single-writer)
- Umami Cloud support (API key flow, not username/password)
- Write operations (creating websites, managing users)
- Webhook / push-based alerting
- Per-user rate limiting

---

## Open Questions (to verify during implementation)

- Exact Umami v2 endpoint paths for event stats and reports — verify against source
- MCP SDK auth helper API surface — confirm it supports custom credential validation
- Whether `bun:sqlite` WAL mode is needed for concurrent reads during background jobs
