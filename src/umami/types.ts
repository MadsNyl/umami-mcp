import { z } from "zod";

// Auth
export const UmamiLoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    role: z.string(),
    createdAt: z.string(),
    isAdmin: z.boolean(),
  }),
});
export type UmamiLoginResponse = z.infer<typeof UmamiLoginResponseSchema>;

// Websites
export const UmamiWebsiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  shareId: z.string().nullable().optional(),
  createdAt: z.string(),
  teamId: z.string().nullable().optional(),
});
export type UmamiWebsite = z.infer<typeof UmamiWebsiteSchema>;

export const UmamiWebsiteListResponseSchema = z.object({
  data: z.array(UmamiWebsiteSchema),
  count: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type UmamiWebsiteListResponse = z.infer<typeof UmamiWebsiteListResponseSchema>;

// Stats
export const UmamiStatsSchema = z.object({
  pageviews: z.number(),
  visitors: z.number(),
  visits: z.number(),
  bounces: z.number(),
  totaltime: z.number(),
  comparison: z.object({
    pageviews: z.number(),
    visitors: z.number(),
    visits: z.number(),
    bounces: z.number(),
    totaltime: z.number(),
  }).optional(),
});
export type UmamiStats = z.infer<typeof UmamiStatsSchema>;

// Pageviews
export const UmamiPageviewsSchema = z.object({
  pageviews: z.array(z.object({ x: z.string(), y: z.number() })),
  sessions: z.array(z.object({ x: z.string(), y: z.number() })),
});
export type UmamiPageviews = z.infer<typeof UmamiPageviewsSchema>;

// Active visitors
export const UmamiActiveVisitorsSchema = z.object({
  visitors: z.number(),
});
export type UmamiActiveVisitors = z.infer<typeof UmamiActiveVisitorsSchema>;

// Metrics
export const UmamiMetricSchema = z.object({
  x: z.string(),
  y: z.number(),
});
export const UmamiMetricsResponseSchema = z.array(UmamiMetricSchema);
export type UmamiMetric = z.infer<typeof UmamiMetricSchema>;

// Events
export const UmamiEventSchema = z.object({
  eventName: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  urlPath: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  browser: z.string().nullable().optional(),
  os: z.string().nullable().optional(),
  device: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});
export const UmamiEventsResponseSchema = z.object({
  data: z.array(UmamiEventSchema),
  count: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type UmamiEventsResponse = z.infer<typeof UmamiEventsResponseSchema>;

// Event stats
export const UmamiEventStatsSchema = z.object({
  data: z.object({
    events: z.number(),
    visitors: z.number(),
    visits: z.number(),
    uniqueEvents: z.number(),
    comparison: z.object({
      events: z.number(),
      visitors: z.number(),
      visits: z.number(),
      uniqueEvents: z.number(),
    }).optional(),
  }),
});
export type UmamiEventStats = z.infer<typeof UmamiEventStatsSchema>;

// Event series
export const UmamiEventSeriesSchema = z.array(
  z.object({ x: z.string(), y: z.number(), eventName: z.string().optional() })
);
export type UmamiEventSeries = z.infer<typeof UmamiEventSeriesSchema>;

// Event data events
export const UmamiEventDataEventsSchema = z.array(
  z.object({
    eventName: z.string(),
    propertyName: z.string().optional(),
    count: z.number().optional(),
  })
);
export type UmamiEventDataEvents = z.infer<typeof UmamiEventDataEventsSchema>;

// Sessions
export const UmamiSessionSchema = z.object({
  id: z.string().optional(),
  websiteId: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  device: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  createdAt: z.string().optional(),
  language: z.string().optional(),
});
export const UmamiSessionsResponseSchema = z.object({
  data: z.array(UmamiSessionSchema),
  count: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type UmamiSessionsResponse = z.infer<typeof UmamiSessionsResponseSchema>;

// Session stats
export const UmamiSessionStatsSchema = z.object({
  pageviews: z.object({ value: z.number() }),
  visitors: z.object({ value: z.number() }),
  visits: z.object({ value: z.number() }),
  countries: z.object({ value: z.number() }),
  events: z.object({ value: z.number() }),
});
export type UmamiSessionStats = z.infer<typeof UmamiSessionStatsSchema>;

// Reports
export const UmamiFunnelStepSchema = z.object({
  type: z.string(),
  value: z.string(),
  visitors: z.number(),
  dropoff: z.number(),
  conversionRate: z.number(),
});
export const UmamiFunnelResponseSchema = z.array(UmamiFunnelStepSchema);
export type UmamiFunnelResponse = z.infer<typeof UmamiFunnelResponseSchema>;

export const UmamiRetentionDaySchema = z.object({
  date: z.string(),
  visitors: z.number(),
  returnVisitors: z.number(),
  percentage: z.number(),
});
export const UmamiRetentionResponseSchema = z.array(UmamiRetentionDaySchema);
export type UmamiRetentionResponse = z.infer<typeof UmamiRetentionResponseSchema>;

export const UmamiUtmSchema = z.object({
  x: z.string(),
  y: z.number(),
});
export const UmamiUtmResponseSchema = z.array(UmamiUtmSchema);
export type UmamiUtmResponse = z.infer<typeof UmamiUtmResponseSchema>;

export const UmamiJourneyStepSchema = z.object({
  path: z.string(),
  count: z.number(),
  dropoff: z.number().optional(),
});
export const UmamiJourneyResponseSchema = z.array(UmamiJourneyStepSchema);
export type UmamiJourneyResponse = z.infer<typeof UmamiJourneyResponseSchema>;
