const YUSSOR_ENDPOINT =
  import.meta.env.VITE_YUSSOR_ENDPOINT || "/api/yusr";

const DIRECT_YUSSOR_ACTIONS = {
  openSession: "open-session",
  completeSession: "complete-session",
};

export async function callYussor(action, payload = {}) {
  if (isDirectYussorEndpoint()) {
    return callDirectYussor(action, payload);
  }

  let response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);

  try {
    response = await fetch(YUSSOR_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("انتهت مهلة الاتصال بخدمة يسر باي. حاول مرة أخرى.");
    }
    throw new Error("تعذر الاتصال بخدمة يسر باي. تحقق من الإنترنت وحاول مرة أخرى.");
  } finally {
    window.clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "تعذر الاتصال بخدمة يسر باي");
  }

  return data;
}

async function callDirectYussor(action, payload) {
  const endpoint = DIRECT_YUSSOR_ACTIONS[action];

  if (!endpoint) {
    throw new Error("تعذر تنفيذ طلب يسر باي");
  }

  const data = await postJson(`${trimSlash(YUSSOR_ENDPOINT)}/${endpoint}`, payload);
  const success = Boolean(data.ok);

  return {
    success,
    message: firstMessage(data.yusr) || (success ? "تمت العملية بنجاح" : "تعذر إكمال العملية"),
    sessionID: payload.transactionId || payload.sessionID || "",
    transactionId: payload.transactionId || payload.sessionID || "",
    traceId: data.yusr?.traceId || "",
    raw: data.yusr,
  };
}

async function postJson(url, payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "تعذر الاتصال بخدمة يسر باي");
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("انتهت مهلة الاتصال بخدمة يسر باي. حاول مرة أخرى.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function isDirectYussorEndpoint() {
  return /\/api\/yusr\/?$/.test(trimSlash(YUSSOR_ENDPOINT));
}

function firstMessage(response) {
  const messages = response?.messages;
  if (Array.isArray(messages)) return String(messages[0] || "");
  return "";
}

function trimSlash(value) {
  return String(value).replace(/\/+$/, "");
}
