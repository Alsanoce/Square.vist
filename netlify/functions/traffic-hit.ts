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

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const domain = readEnv("MONITOR_DOMAIN", new URL(req.url).hostname);
  const windowStart = startOfHour(new Date());
  const store = getStore({ name: "traffic-alerts", consistency: "strong" });
  const key = bucketKey(domain, windowStart);
  const current = await store.get(key, { type: "json" });
  const bucket = isTrafficBucket(current)
    ? current
    : {
        count: 0,
        windowStart: windowStart.toISOString(),
        updatedAt: windowStart.toISOString()
      };

  bucket.count += 1;
  bucket.updatedAt = new Date().toISOString();

  await store.setJSON(key, bucket);

  return new Response(null, { status: 204 });
};

export const config: Config = {
  path: "/api/traffic-hit",
  method: ["POST"]
};

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
