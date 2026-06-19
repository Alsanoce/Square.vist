import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

declare const Netlify:
  | {
      env: {
        get(name: string): string | undefined;
      };
    }
  | undefined;

declare const process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;

type YussorSession = {
  validTo?: string;
  refreshToken?: string;
  systemIdentity?: string;
  creds?: number;
  tag?: number;
  value?: string;
  savedAt?: string;
};

const ENDPOINT_BASE = "/api/OnlinePaymentServices";
const SESSION_MAX_AGE_MS = 15 * 60 * 1000;

class PublicPaymentError extends Error {}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();

    if (body.action === "openSession") {
      return json(await openSession(body));
    }

    if (body.action === "completeSession") {
      return json(await completeSession(body));
    }

    return json({ success: false, message: "invalid action" }, 400);
  } catch (error) {
    console.error("[yussor-payment]", error);
    return json(
      {
        success: false,
        message:
          error instanceof PublicPaymentError
            ? error.message
            : "تعذر إكمال عملية يسر باي حاليا. حاول مرة أخرى.",
      },
      500
    );
  }
};

export const config: Config = {
  path: "/api/yussor-payment",
  method: ["POST"],
};

async function openSession(body: Record<string, unknown>) {
  const amount = toNumber(body.amount);
  const identityCard = String(body.identityCard || "").trim();
  const transactionId = String(body.transactionId || "").trim();

  if (!amount || !identityCard || !transactionId) {
    return {
      success: false,
      message: "الرجاء إدخال رقم البطاقة والقيمة بشكل صحيح",
    };
  }

  const auth = await signIn();
  const response = await yussorPost(
    "OpenSession",
    {
      amount,
      identityCard,
      transactionId,
      onlineOperation: Number(body.onlineOperation || 1),
    },
    auth.content
  );

  if (response.type === 1) {
    await saveSession(transactionId, response.content || auth.content);
  }

  return normalizeYussorResponse(response, {
    sessionID: transactionId,
    transactionId,
  });
}

async function completeSession(body: Record<string, unknown>) {
  const otp = String(body.otp || "").trim();
  const transactionId = String(body.transactionId || "").trim();

  if (!otp || !transactionId) {
    return {
      success: false,
      message: "الرجاء إدخال كود التحقق",
    };
  }

  const session = await loadSession(transactionId);
  const response = await yussorPost("CompleteSession", { otp }, session);

  if (response.type === 1) {
    await deleteSession(transactionId);
  }

  return normalizeYussorResponse(response, {
    sessionID: transactionId,
    transactionId,
  });
}

async function signIn() {
  const response = await yussorPost("Signin", {
    userId: Number(requiredEnv("YUSSOR_USER_ID")),
    pin: requiredEnv("YUSSOR_PIN"),
    providerId: Number(requiredEnv("YUSSOR_PROVIDER_ID")),
    authUserType: Number(readEnv("YUSSOR_AUTH_USER_TYPE", "0")),
  });

  if (response.type !== 1 || !response.content) {
    throw new PublicPaymentError(firstMessage(response) || "تعذر تسجيل الدخول إلى يسر باي");
  }

  return response;
}

async function yussorPost(
  endpoint: string,
  payload: Record<string, unknown>,
  session?: YussorSession
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const token = session?.value || session?.refreshToken;
  if (token) {
    const header = readEnv("YUSSOR_AUTH_HEADER", "Authorization");
    const scheme = readEnv("YUSSOR_AUTH_SCHEME", "Bearer");
    headers[header] = scheme ? `${scheme} ${token}` : token;
  }

  const response = await fetch(
    `${trimSlash(requiredEnv("YUSSOR_BASE_URL"))}${ENDPOINT_BASE}/${endpoint}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    }
  );

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new PublicPaymentError(
      firstMessage(data) || "تعذر الاتصال بخدمة يسر باي. حاول مرة أخرى."
    );
  }

  return data;
}

async function saveSession(transactionId: string, session: YussorSession) {
  const store = getStore({ name: "yussor-pay-sessions", consistency: "strong" });
  await store.setJSON(sessionKey(transactionId), {
    ...session,
    savedAt: new Date().toISOString(),
  });
}

async function loadSession(transactionId: string) {
  const store = getStore({ name: "yussor-pay-sessions", consistency: "strong" });
  const session = await store.get(sessionKey(transactionId), { type: "json" });

  if (!session || typeof session !== "object") {
    throw new PublicPaymentError("انتهت جلسة الدفع، الرجاء بدء العملية من جديد");
  }

  const typedSession = session as YussorSession;
  const savedAt = Date.parse(typedSession.savedAt || "");
  const validTo = Date.parse(typedSession.validTo || "");
  const isTooOld = Number.isFinite(savedAt) && Date.now() - savedAt > SESSION_MAX_AGE_MS;
  const isProviderExpired = Number.isFinite(validTo) && validTo <= Date.now();

  if (isTooOld || isProviderExpired) {
    await deleteSession(transactionId);
    throw new PublicPaymentError("انتهت جلسة الدفع، الرجاء بدء العملية من جديد");
  }

  return typedSession;
}

async function deleteSession(transactionId: string) {
  const store = getStore({ name: "yussor-pay-sessions", consistency: "strong" });
  await store.delete(sessionKey(transactionId));
}

function normalizeYussorResponse(
  response: Record<string, unknown>,
  extra: Record<string, unknown>
) {
  const success = Number(response.type) === 1;
  return {
    success,
    message: firstMessage(response) || (success ? "تمت العملية بنجاح" : "تعذر إكمال العملية"),
    ...extra,
    traceId: response.traceId || "",
  };
}

function firstMessage(response: Record<string, unknown>) {
  const messages = response.messages;
  if (Array.isArray(messages)) return String(messages[0] || "");
  return "";
}

function sessionKey(transactionId: string) {
  return `sessions/${transactionId.replace(/[^a-zA-Z0-9_-]/g, "-")}.json`;
}

function readEnv(name: string, fallback = "") {
  const value =
    typeof Netlify !== "undefined"
      ? Netlify.env.get(name)
      : typeof process !== "undefined"
        ? process.env[name]
        : "";
  return value?.trim() || fallback;
}

function requiredEnv(name: string) {
  const value = readEnv(name);
  if (!value) {
    console.error(`[yussor-payment] Missing required environment variable: ${name}`);
    throw new PublicPaymentError("خدمة يسر باي غير متاحة حاليا. حاول لاحقا.");
  }
  return value;
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
