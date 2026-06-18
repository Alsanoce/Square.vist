const YUSSOR_ENDPOINT =
  import.meta.env.VITE_YUSSOR_ENDPOINT || "/api/yussor-payment";

export async function callYussor(action, payload = {}) {
  const response = await fetch(YUSSOR_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "تعذر الاتصال بخدمة يسر باي");
  }

  return data;
}
