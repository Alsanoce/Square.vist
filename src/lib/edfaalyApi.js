const EDFAALY_ENDPOINT =
  import.meta.env.VITE_EDFAALY_ENDPOINT ||
  "https://script.google.com/macros/s/AKfycbwKU-loAWpihTgOJQxDkl5GeIzsEIy6_mMNXILO0GGNibJSQN6Nu6U17YRa2aPoVdZuJw/exec";

function buildUrl(action, params) {
  const callback = `edfaalyCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const query = new URLSearchParams({
    action,
    callback,
    ...params,
  });

  return {
    callback,
    url: `${EDFAALY_ENDPOINT}?${query.toString()}`,
  };
}

export function callEdfaaly(action, params = {}) {
  return new Promise((resolve, reject) => {
    const { callback, url } = buildUrl(action, params);
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("انتهت مهلة الاتصال بسيرفر الدفع"));
    }, 30000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callback];
      script.remove();
    }

    window[callback] = (response) => {
      cleanup();
      resolve(response);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("تعذر الاتصال بسيرفر الدفع"));
    };

    script.src = url;
    document.body.appendChild(script);
  });
}
