import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

declare const Netlify:
  | {
      env: {
        get(name: string): string | undefined;
      };
    }
  | undefined;

type TrafficBucket = {
  count: number;
  windowStart: string;
  updatedAt: string;
};

type HourStat = {
  windowStart: string;
  windowEnd: string;
  count: number;
};

export default async (req: Request) => {
  const url = new URL(req.url);
  const requiredToken = readEnv("TRAFFIC_STATS_TOKEN", "");

  if (requiredToken && url.searchParams.get("token") !== requiredToken) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const domain = readEnv("MONITOR_DOMAIN", url.hostname);
  const limit = readPositiveInt("TRAFFIC_LIMIT", 100);
  const hours = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("hours") || "24", 10), 1),
    168
  );
  const now = new Date();
  const currentHourStart = startOfHour(now);
  const lastCompletedHourStart = new Date(
    currentHourStart.getTime() - 60 * 60_000
  );
  const store = getStore({ name: "traffic-alerts", consistency: "strong" });
  const currentHour = await readHour(store, domain, currentHourStart);
  const lastCompletedHour = await readHour(store, domain, lastCompletedHourStart);
  const history = await Promise.all(
    Array.from({ length: hours }, (_, index) => {
      const hourStart = new Date(
        currentHourStart.getTime() - index * 60 * 60_000
      );
      return readHour(store, domain, hourStart);
    })
  );
  const total = history.reduce((sum, hour) => sum + hour.count, 0);
  const peak = history.reduce(
    (highest, hour) => (hour.count > highest.count ? hour : highest),
    history[0]
  );

  return jsonResponse({
    ok: true,
    domain,
    metric: "requests",
    limit,
    timezone: "UTC",
    generatedAt: now.toISOString(),
    currentHour: withLimit(currentHour, limit),
    lastCompletedHour: withLimit(lastCompletedHour, limit),
    totals: {
      hours,
      requests: total,
      averagePerHour: Math.round(total / hours),
      peak: withLimit(peak, limit)
    },
    history: history.map((hour) => withLimit(hour, limit))
  });
};

export const config: Config = {
  path: "/api/traffic-stats",
  method: ["GET"]
};

async function readHour(
  store: ReturnType<typeof getStore>,
  domain: string,
  windowStart: Date
): Promise<HourStat> {
  const bucket = await store.get(bucketKey(domain, windowStart), {
    type: "json"
  });
  const count = isTrafficBucket(bucket) ? bucket.count : 0;

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: new Date(windowStart.getTime() + 60 * 60_000).toISOString(),
    count
  };
}
function withLimit(hour: HourStat, limit: number) {
  return {
    ...hour,
    limit,
    aboveLimit: hour.count >= limit,
    percentOfLimit: Math.round((hour.count / limit) * 100)
  };
}

function bucketKey(domain: string, windowStart: Date) {
  return `traffic/${slug(domain)}/${windowStart.toISOString().slice(0, 13)}.json`;
}

function startOfHour(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours()
    )
  );
}

function readEnv(name: string, fallback = "") {
  const value = typeof Netlify !== "undefined" ? Netlify.env.get(name) : "";
  return value?.trim() || fallback;
}

function readPositiveInt(name: string, fallback: number) {
  const value = readEnv(name);
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isTrafficBucket(value: unknown): value is TrafficBucket {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as TrafficBucket).count === "number"
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
