import { z } from "zod";
import {
  UmamiLoginResponseSchema,
  UmamiWebsiteListResponseSchema,
  UmamiWebsiteSchema,
  UmamiStatsSchema,
  UmamiPageviewsSchema,
  UmamiActiveVisitorsSchema,
  UmamiMetricsResponseSchema,
  UmamiEventsResponseSchema,
  UmamiEventStatsSchema,
  UmamiEventSeriesSchema,
  UmamiEventDataEventsSchema,
  UmamiSessionsResponseSchema,
  UmamiSessionStatsSchema,
  UmamiFunnelResponseSchema,
  UmamiRetentionResponseSchema,
  UmamiUtmResponseSchema,
  UmamiJourneyResponseSchema,
} from "./types.js";
import type {
  UmamiLoginResponse,
  UmamiWebsiteListResponse,
  UmamiWebsite,
  UmamiStats,
  UmamiPageviews,
  UmamiActiveVisitors,
  UmamiMetric,
  UmamiEventsResponse,
  UmamiEventStats,
  UmamiEventSeries,
  UmamiEventDataEvents,
  UmamiSessionsResponse,
  UmamiSessionStats,
  UmamiFunnelResponse,
  UmamiRetentionResponse,
  UmamiUtmResponse,
  UmamiJourneyResponse,
} from "./types.js";

export class UmamiApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "UmamiApiError";
  }
}

type QueryParams = Record<string, string | number | boolean | undefined>;

async function request<T>(
  baseUrl: string,
  path: string,
  schema: z.ZodType<T>,
  options: {
    jwt?: string;
    method?: "GET" | "POST";
    body?: unknown;
    params?: QueryParams;
  } = {}
): Promise<T> {
  const { jwt, method = "GET", body, params } = options;
  const url = new URL(path, baseUrl);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new UmamiApiError(res.status, `Umami API ${res.status}: ${text}`);
  }

  const json = await res.json();
  return schema.parse(json);
}

// Factory that creates a client bound to a specific Umami URL
export function createUmamiClient(baseUrl: string) {
  return {
    login(username: string, password: string): Promise<UmamiLoginResponse> {
      return request(baseUrl, "/api/auth/login", UmamiLoginResponseSchema, {
        method: "POST",
        body: { username, password },
      });
    },

    listWebsites(
      jwt: string,
      params?: { includeTeams?: boolean; search?: string; page?: number; pageSize?: number }
    ): Promise<UmamiWebsiteListResponse> {
      return request(baseUrl, "/api/websites", UmamiWebsiteListResponseSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    getWebsite(jwt: string, websiteId: string): Promise<UmamiWebsite> {
      return request(baseUrl, `/api/websites/${websiteId}`, UmamiWebsiteSchema, { jwt });
    },

    getStats(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number; compare?: string }
    ): Promise<UmamiStats> {
      return request(baseUrl, `/api/websites/${websiteId}/stats`, UmamiStatsSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    getPageviews(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number; unit: string; timezone?: string }
    ): Promise<UmamiPageviews> {
      return request(baseUrl, `/api/websites/${websiteId}/pageviews`, UmamiPageviewsSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    getActiveVisitors(jwt: string, websiteId: string): Promise<UmamiActiveVisitors> {
      return request(baseUrl, `/api/websites/${websiteId}/active`, UmamiActiveVisitorsSchema, { jwt });
    },

    getMetrics(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number; type: string; limit?: number; offset?: number }
    ): Promise<UmamiMetric[]> {
      return request(baseUrl, `/api/websites/${websiteId}/metrics`, UmamiMetricsResponseSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    listEvents(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number; page?: number; pageSize?: number }
    ): Promise<UmamiEventsResponse> {
      return request(baseUrl, `/api/websites/${websiteId}/events`, UmamiEventsResponseSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    getEventStats(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number }
    ): Promise<UmamiEventStats> {
      return request(baseUrl, `/api/websites/${websiteId}/events/stats`, UmamiEventStatsSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    getEventSeries(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number; unit: string; timezone?: string }
    ): Promise<UmamiEventSeries> {
      return request(baseUrl, `/api/websites/${websiteId}/events/series`, UmamiEventSeriesSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    getEventDataEvents(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number }
    ): Promise<UmamiEventDataEvents> {
      return request(
        baseUrl,
        `/api/websites/${websiteId}/event-data/events`,
        UmamiEventDataEventsSchema,
        { jwt, params: params as QueryParams }
      );
    },

    listSessions(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number; page?: number; pageSize?: number }
    ): Promise<UmamiSessionsResponse> {
      return request(baseUrl, `/api/websites/${websiteId}/sessions`, UmamiSessionsResponseSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    getSessionStats(
      jwt: string,
      websiteId: string,
      params: { startAt: number; endAt: number }
    ): Promise<UmamiSessionStats> {
      return request(baseUrl, `/api/websites/${websiteId}/sessions/stats`, UmamiSessionStatsSchema, {
        jwt,
        params: params as QueryParams,
      });
    },

    runFunnel(
      jwt: string,
      body: {
        websiteId: string;
        startDate: string;
        endDate: string;
        steps: Array<{ type: string; value: string }>;
        window?: number;
      }
    ): Promise<UmamiFunnelResponse> {
      return request(baseUrl, "/api/reports/funnel", UmamiFunnelResponseSchema, {
        jwt,
        method: "POST",
        body,
      });
    },

    runRetention(
      jwt: string,
      body: { websiteId: string; startDate: string; endDate: string }
    ): Promise<UmamiRetentionResponse> {
      return request(baseUrl, "/api/reports/retention", UmamiRetentionResponseSchema, {
        jwt,
        method: "POST",
        body,
      });
    },

    runUtmReport(
      jwt: string,
      body: { websiteId: string; startDate: string; endDate: string }
    ): Promise<UmamiUtmResponse> {
      return request(baseUrl, "/api/reports/utm", UmamiUtmResponseSchema, {
        jwt,
        method: "POST",
        body,
      });
    },

    runJourney(
      jwt: string,
      body: { websiteId: string; startDate: string; endDate: string; steps?: number }
    ): Promise<UmamiJourneyResponse> {
      return request(baseUrl, "/api/reports/journey", UmamiJourneyResponseSchema, {
        jwt,
        method: "POST",
        body,
      });
    },
  };
}

export type UmamiClient = ReturnType<typeof createUmamiClient>;
