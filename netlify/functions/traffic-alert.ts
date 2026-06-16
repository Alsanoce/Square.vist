import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

declare const Netlify:
  | {
      env: {
        get(name: string): string | undefined;
      };
    }
  | undefined;

type TrafficSnapshot = {
  domain: string;
  metric: string;
  source: string;
  value: number;
  windowStart: string;
  windowEnd: string;
};

type AlertState = {
  lastAlertAt?: string;
  lastStatus?: "above" | "below";
  lastValue?: number;
};

const DEFAULT_LIMIT = 1000;
const DEFAULT_WINDOW_MINUTES = 60;
const DEFAULT_COOLDOWN_MINUTES = 60;

export default async (req: Request) => {
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const snapshot = await readTrafficSnapshot();
    const decision = await maybeSendAlert(snapshot, dryRun);

    return jsonResponse({
      ok: true,
      dryRun,
      snapshot,
      decision
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("traffic-alert failed", error);

    return jsonResponse(
      {
        ok: false,
        error: message
      },
      500
    );
  }
};

export const config: Config = {
  schedule: "@hourly"
};

async function readTrafficSnapshot(): Promise<TrafficSnapshot> {
  const domain = requiredEnv("MONITOR_DOMAIN");
  const source = readEnv("TRAFFIC_SOURCE", "self").toLowerCase();
  const windowMinutes = readPositiveInt(
    "TRAFFIC_WINDOW_MINUTES",
    DEFAULT_WINDOW_MINUTES
  );
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60_000);

  if (source === "self") {
    return readSelfTraffic(domain, now);
  }

  if (source === "plausible") {
    return readPlausibleTraffic(domain, windowStart, now);
  }

  if (source === "generic-json") {
    return readGenericJsonTraffic(domain, windowStart, now);
  }

  throw new Error(
    `Unsupported TRAFFIC_SOURCE "${source}". Use "self", "generic-json", or "plausible".`
  );
}

async function readSelfTraffic(
  domain: string,
  now: Date
): Promise<TrafficSnapshot> {
  const windowEnd = startOfHour(now);
  const windowStart = new Date(windowEnd.getTime() - 60 * 60_000);
  const store = getStore({ name: "traffic-alerts", consistency: "strong" });
  const bucket = await store.get(bucketKey(domain, windowStart), {
    type: "json"
  });
  const value = isTrafficBucket(bucket) ? bucket.count : 0;

  return {
    domain,
    metric: "requests",
    source: "self",
    value,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

async function readGenericJsonTraffic(
  domain: string,
  windowStart: Date,
  windowEnd: Date
): Promise<TrafficSnapshot> {
  const apiUrl = requiredEnv("TRAFFIC_API_URL");
  const method = readEnv("TRAFFIC_API_METHOD", "GET").toUpperCase();
  const metric = readEnv("TRAFFIC_METRIC", "requests");
  const resolvedUrl = fillTemplate(apiUrl, domain, windowStart, windowEnd, true);
  const headers = parseJsonEnv<Record<string, string>>(
    "TRAFFIC_API_HEADERS_JSON",
    {}
  );
  const bodyTemplate = readEnv("TRAFFIC_API_BODY_JSON", "");
  const requestInit: RequestInit = {
    method,
    headers
  };

  if (method !== "GET" && bodyTemplate) {
    requestInit.body = fillTemplate(
      bodyTemplate,
      domain,
      windowStart,
      windowEnd,
      false
    );
    requestInit.headers = {
      "content-type": "application/json",
      ...headers
    };
  }

  const response = await fetch(resolvedUrl, requestInit);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Traffic API returned ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  const payload = parseJson(responseText, "TRAFFIC_API response");
  const configuredPath = readEnv("TRAFFIC_JSON_PATH", "");
  const value =
    configuredPath.length > 0
      ? numberFromPath(payload, configuredPath)
      : firstNumberFromPaths(payload, [
          metric,
          `data.${metric}`,
          `totals.${metric}`,
          `result.${metric}`,
          "traffic",
          "visits",
          "visitors",
          "pageviews",
          "requests",
          "total",
          "count",
          "data.total",
          "data.count",
          "results.visitors.value",
          "results.pageviews.value"
        ]);

  return {
    domain,
    metric,
    source: "generic-json",
    value,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

async function readPlausibleTraffic(
  domain: string,
  windowStart: Date,
  windowEnd: Date
): Promise<TrafficSnapshot> {
  const apiKey = requiredEnv("PLAUSIBLE_API_KEY");
  const apiBase = readEnv("PLAUSIBLE_API_BASE", "https://plausible.io");
  const period = readEnv("PLAUSIBLE_PERIOD", "day");
  const metric = readEnv("TRAFFIC_METRIC", "visitors");
  const endpoint = new URL("/api/v1/stats/aggregate", apiBase);

  endpoint.searchParams.set("site_id", domain);
  endpoint.searchParams.set("period", period);
  endpoint.searchParams.set("metrics", metric);

  if (period === "custom") {
    endpoint.searchParams.set(
      "date",
      `${toDateOnly(windowStart)},${toDateOnly(windowEnd)}`
    );
  }

  const response = await fetch(endpoint, {
    headers: {
      authorization: `Bearer ${apiKey}`
    }
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Plausible API returned ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  const payload = parseJson(responseText, "Plausible API response");
  const value = firstNumberFromPaths(payload, [
    `results.${metric}.value`,
    `results.${metric}`,
    metric
  ]);

  return {
    domain,
    metric,
    source: "plausible",
    value,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

async function maybeSendAlert(snapshot: TrafficSnapshot, dryRun: boolean) {
  const limit = readPositiveInt("TRAFFIC_LIMIT", DEFAULT_LIMIT);
  const cooldownMinutes = readPositiveInt(
    "ALERT_COOLDOWN_MINUTES",
    DEFAULT_COOLDOWN_MINUTES
  );
  const aboveLimit = snapshot.value >= limit;
  const store = getStore({ name: "traffic-alerts", consistency: "strong" });
  const key = `state/${slug(snapshot.domain)}-${slug(snapshot.metric)}.json`;
  const previousState = await store.get(key, { type: "json" });
  const state = isAlertState(previousState) ? previousState : {};
  const lastAlertAt = state.lastAlertAt ? new Date(state.lastAlertAt) : null;
  const minutesSinceLastAlert = lastAlertAt
    ? (Date.now() - lastAlertAt.getTime()) / 60_000
    : Number.POSITIVE_INFINITY;
  const shouldNotify =
    aboveLimit &&
    (state.lastStatus !== "above" || minutesSinceLastAlert >= cooldownMinutes);
  const nextState: AlertState = {
    lastAlertAt: shouldNotify && !dryRun ? new Date().toISOString() : state.lastAlertAt,
    lastStatus: aboveLimit ? "above" : "below",
    lastValue: snapshot.value
  };

  if (shouldNotify && !dryRun) {
    await sendTelegramAlert(snapshot, limit);
  }

  if (!dryRun) {
    await store.setJSON(key, nextState);
  }

  return {
    limit,
    aboveLimit,
    shouldNotify,
    notified: shouldNotify && !dryRun,
    cooldownMinutes,
    minutesSinceLastAlert:
      minutesSinceLastAlert === Number.POSITIVE_INFINITY
        ? null
        : Math.round(minutesSinceLastAlert)
  };
}

async function sendTelegramAlert(snapshot: TrafficSnapshot, limit: number) {
  const botToken = requiredEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requiredEnv("TELEGRAM_CHAT_ID");
  const threadId = readEnv("TELEGRAM_MESSAGE_THREAD_ID", "");
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body: Record<string, string | number | boolean> = {
    chat_id: chatId,
    text: [
      "Traffic alert",
      `Domain: ${snapshot.domain}`,
      `Source: ${snapshot.source}`,
      `Metric: ${snapshot.metric}`,
      `Value: ${snapshot.value}`,
      `Limit: ${limit}`,
      `Window: ${snapshot.windowStart} to ${snapshot.windowEnd}`
    ].join("\n"),
    disable_web_page_preview: true
  };

  if (threadId.length > 0) {
    body.message_thread_id = Number(threadId);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Telegram API returned ${response.status}: ${responseText.slice(0, 500)}`
    );
  }
}

function readEnv(name: string, fallback = "") {
  const value = typeof Netlify !== "undefined" ? Netlify.env.get(name) : "";
  return value?.trim() || fallback;
}

function requiredEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

function readPositiveInt(name: string, fallback: number) {
  const value = readEnv(name);

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parseJsonEnv<T>(name: string, fallback: T): T {
  const value = readEnv(name);

  if (!value) {
    return fallback;
  }

  return parseJson(value, name) as T;
}

function parseJson(value: string, label: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function fillTemplate(
  template: string,
  domain: string,
  start: Date,
  end: Date,
  encodeValues = false
) {
  const transform = encodeValues ? encodeURIComponent : (raw: string) => raw;

  return template
    .replaceAll("{domain}", transform(domain))
    .replaceAll("{windowStart}", transform(start.toISOString()))
    .replaceAll("{windowEnd}", transform(end.toISOString()))
    .replaceAll(
      "{windowMinutes}",
      String(Math.round((end.getTime() - start.getTime()) / 60_000))
    );
}

function firstNumberFromPaths(payload: unknown, paths: string[]) {
  for (const path of paths) {
    try {
      return numberFromPath(payload, path);
    } catch {
      // Keep trying likely paths.
    }
  }

  throw new Error(
    `Could not find a numeric traffic value. Set TRAFFIC_JSON_PATH explicitly.`
  );
}

function numberFromPath(payload: unknown, path: string) {
  const value = path.split(".").reduce<unknown>((current, segment) => {
    if (
      current !== null &&
      typeof current === "object" &&
      segment in current
    ) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, payload);
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Path "${path}" did not resolve to a number.`);
  }

  return numberValue;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
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

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isAlertState(value: unknown): value is AlertState {
  return value !== null && typeof value === "object";
}

function isTrafficBucket(value: unknown): value is { count: number } {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { count?: unknown }).count === "number"
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
