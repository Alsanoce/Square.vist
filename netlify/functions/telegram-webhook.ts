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

type TelegramUpdate = {
  message?: {
    chat: {
      id: number | string;
    };
    text?: string;
  };
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = readEnv("TELEGRAM_WEBHOOK_SECRET", "");
  const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";

  if (webhookSecret && receivedSecret !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = (await req.json()) as TelegramUpdate;
  const chatId = String(update.message?.chat.id || "");
  const allowedChatId = readEnv("TELEGRAM_CHAT_ID", "");
  const text = update.message?.text?.trim().toLowerCase() || "";

  if (!chatId) {
    return jsonResponse({ ok: true, ignored: true });
  }

  if (allowedChatId && chatId !== allowedChatId) {
    await sendTelegramMessage(chatId, "غير مصرح لهذا الشات.");
    return jsonResponse({ ok: true, ignored: true });
  }

  if (text === "/stats" || text === "stats" || text === "احصائيات") {
    await sendTelegramMessage(chatId, await buildStatsMessage());
    return jsonResponse({ ok: true });
  }

  if (text === "/help" || text === "help") {
    await sendTelegramMessage(
      chatId,
      ["الأوامر المتاحة:", "/stats - إحصائيات الترافيك", "/help - المساعدة"].join(
        "\n"
      )
    );
    return jsonResponse({ ok: true });
  }

  await sendTelegramMessage(chatId, "اكتب /stats باش نرسل لك إحصائيات الترافيك.");
  return jsonResponse({ ok: true });
};

export const config: Config = {
  path: "/api/telegram-webhook",
  method: ["POST"]
};

async function buildStatsMessage() {
  const domain = readEnv("MONITOR_DOMAIN", "saniah.ly");
  const limit = readPositiveInt("TRAFFIC_LIMIT", 100);
  const now = new Date();
  const currentHourStart = startOfHour(now);
  const lastCompletedHourStart = new Date(
    currentHourStart.getTime() - 60 * 60_000
  );
  const store = getStore({ name: "traffic-alerts", consistency: "strong" });
  const current = await readHour(store, domain, currentHourStart);
  const last = await readHour(store, domain, lastCompletedHourStart);
  const last24 = await Promise.all(
    Array.from({ length: 24 }, (_, index) => {
      const hourStart = new Date(
        currentHourStart.getTime() - index * 60 * 60_000
      );
      return readHour(store, domain, hourStart);
    })
  );
  const total = last24.reduce((sum, hour) => sum + hour.count, 0);
  const peak = last24.reduce(
    (highest, hour) => (hour.count > highest.count ? hour : highest),
    last24[0]
  );

  return [
    `Traffic stats for ${domain}`,
    `Current hour: ${current.count}/${limit}`,
    `Last completed hour: ${last.count}/${limit}`,
    `Last 24h total: ${total}`,
    `Peak hour: ${peak.count} (${peak.windowStart})`,
    `Alert status: ${last.count >= limit ? "above limit" : "below limit"}`,
    `Generated: ${now.toISOString()}`
  ].join("\n");
}

async function readHour(
  store: ReturnType<typeof getStore>,
  domain: string,
  windowStart: Date
) {
  const bucket = await store.get(bucketKey(domain, windowStart), {
    type: "json"
  });

  return {
    windowStart: windowStart.toISOString(),
    count: isTrafficBucket(bucket) ? bucket.count : 0
  };
}

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = requiredEnv("TELEGRAM_BOT_TOKEN");
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${await response.text()}`);
  }
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
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
