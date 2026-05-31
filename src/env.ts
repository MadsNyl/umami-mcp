import { z } from "zod";

const envSchema = z.object({
  UMAMI_URL: z.string().url(),
  MCP_SECRET: z.string().min(32),
  OAUTH_CLIENT_ID: z.string().min(1),
  OAUTH_REDIRECT_URI: z.string().url(),
  SQLITE_PATH: z.string().default("/data/sessions.db"),
  SESSION_TTL_DAYS: z.coerce.number().default(90),
  JWT_REFRESH_INTERVAL_HOURS: z.coerce.number().default(20),
  PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
