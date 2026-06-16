import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

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

const IGNORED_PATH_PREFIXES = ["/.netlify/", "/favicon.ico", "/robots.txt"];
const IGNORED_EXTENSIONS = [
  ".css",
  ".js",
  ".mjs",
  ".map",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot"
];

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const response = await context.next();

  if (shouldCount(req, url, response)) {
    await incrementTrafficBucket(url.hostname);
  }

  return response;
};

export const config: Config = {
  path: "/*"
};

function shouldCount(req: Request, url: URL, response: Response) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  if (response.status >= 400) {
    return false;
  }

  if (IGNORED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return false;
  }

  return !IGNORED_EXTENSIONS.some((extension) =>
    url.pathname.toLowerCase().endsWith(extension)
  );
}

async function incrementTrafficBucket(hostname: string) {
  const domain = readEnv("MONITOR_DOMAIN", hostname);
  const windowStart = startOfHour(new Date());
  const key = bucketKey(domain, windowStart);
  const store = getStore({ name: "traffic-alerts", consistency: "strong" });
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
