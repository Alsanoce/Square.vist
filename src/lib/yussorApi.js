const YUSSOR_ENDPOINT =
  import.meta.env.VITE_YUSSOR_ENDPOINT || "/api/yussor-payment";

export async function callYussor(action, payload = {}) {
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
