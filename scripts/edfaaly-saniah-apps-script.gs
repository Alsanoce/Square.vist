/**
 * Saniah Edfa.ly Payment Web App
 *
 * Google Apps Script backend for:
 * - DoPTrans: start Edfa.ly payment and send OTP to customer.
 * - OnlineConfTrans: confirm payment using OTP.
 * - Logging every request/response into a dedicated Google Sheet.
 *
 * Deploy as:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * Frontend calls use JSONP:
 *   ?callback=cb&action=doPTrans&customerMobile=+2189...&amount=6
 *   ?callback=cb&action=onlineConfTrans&sessionID=...&otp=1234
 */

const CONFIG = {
  // If empty, the script creates a new spreadsheet automatically and stores its ID in Script Properties.
  SPREADSHEET_ID: "",
  SPREADSHEET_NAME: "سقيا ماء - عمليات الدفع",
  SHEET_NAME: "Transactions",

  BANK_ENDPOINT: "http://62.240.55.2:6187/BCDUssd/NewEdfali.asmx",

  // Fill these from the bank.
  MERCHANT_MOBILE: "9XXXXXXXX",
  MERCHANT_PIN: "0000",
  SERVICE_PASSWORD: "123@xdsr$#!!",

  // Telegram notifications are read from Script Properties first:
  // TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
  TELEGRAM_BOT_TOKEN: "",
  TELEGRAM_CHAT_ID: "",
};

const ERROR_MESSAGES = {
  PW1: "كلمة مرور الخدمة غير صحيحة",
  PW: "الرقم السري للتاجر غير صحيح",
  LIMIT: "المبلغ خارج الحدود المسموح بها",
  ACC: "رقم العميل غير موجود في المصرف",
  BAL: "تعذر إتمام العملية",
  ERROR: "خطأ في نظام المصرف",
  FAIL: "فشل في العملية",
  INVALID: "بيانات غير صحيحة",
};

function doGet(e) {
  const callback = getParam(e, "callback", "callback");

  try {
    const action = getParam(e, "action", "").trim();
    let result;

    if (action === "doPTrans") {
      result = handleDoPTrans(e);
    } else if (action === "onlineConfTrans") {
      result = handleOnlineConfTrans(e);
    } else if (action === "testTelegram") {
      result = handleTestTelegram();
    } else if (action === "health") {
      result = { success: true, message: "Saniah payment API is running" };
    } else {
      result = { success: false, message: "invalid action" };
    }

    return jsonp(callback, result);
  } catch (err) {
    return jsonp(callback, { success: false, message: err.message || String(err) });
  }
}

function handleDoPTrans(e) {
  const customerMobile = normalizeCustomerMobile(getParam(e, "customerMobile"));
  const amount = normalizeAmount(
    getParam(e, "decimalAmount") ||
    getParam(e, "amount") ||
    getParam(e, "totalAmount")
  );

  const meta = getMeta(e);

  if (!customerMobile) {
    return failAndLog("doPTrans", meta, "missing customerMobile", { customerMobile, amount });
  }

  if (!amount) {
    return failAndLog("doPTrans", meta, "missing or invalid amount", { customerMobile, amount });
  }

  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ',
    'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ',
    'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    '<soap:Body>',
    '<DoPTrans xmlns="http://tempuri.org/">',
    '<Mobile>' + escapeXml(CONFIG.MERCHANT_MOBILE) + '</Mobile>',
    '<Pin>' + escapeXml(CONFIG.MERCHANT_PIN) + '</Pin>',
    '<Cmobile>' + escapeXml(customerMobile) + '</Cmobile>',
    '<decimalAmount>' + escapeXml(amount) + '</decimalAmount>',
    '<PW>' + escapeXml(CONFIG.SERVICE_PASSWORD) + '</PW>',
    '</DoPTrans>',
    '</soap:Body>',
    '</soap:Envelope>',
  ].join("");

  const bank = callBank("DoPTrans", xml);
  const sessionID = extractTag(bank.raw, "DoPTransResult");
  const mappedError = mapBankError(sessionID);

  if (bank.statusCode !== 200) {
    logTransaction({
      action: "doPTrans",
      status: "http_error",
      customerMobile,
      amount,
      sessionID: "",
      resultCode: "",
      notes: `HTTP ${bank.statusCode}`,
      rawResponse: bank.raw,
      meta,
    });

    return {
      success: false,
      message: "فشل الاتصال بسيرفر المصرف",
      statusCode: bank.statusCode,
      rawResponse: bank.raw,
    };
  }

  if (mappedError) {
    logTransaction({
      action: "doPTrans",
      status: "failed",
      customerMobile,
      amount,
      sessionID: "",
      resultCode: sessionID,
      notes: `Bank error: ${sessionID} - ${mappedError} | amount=${amount}`,
      rawResponse: bank.raw,
      meta,
    });

    return {
      success: false,
      message: mappedError,
      code: sessionID,
      amount,
      rawResponse: bank.raw,
    };
  }

  if (!isValidSessionID(sessionID)) {
    logTransaction({
      action: "doPTrans",
      status: "failed",
      customerMobile,
      amount,
      sessionID: sessionID || "",
      resultCode: sessionID || "",
      notes: `Invalid sessionID | amount=${amount}`,
      rawResponse: bank.raw,
      meta,
    });

    return {
      success: false,
      message: "لم يتم إنشاء جلسة دفع من المصرف",
      amount,
      rawResponse: bank.raw,
    };
  }

  logTransaction({
    action: "doPTrans",
    status: "initiated",
    customerMobile,
    amount,
    sessionID,
    resultCode: sessionID,
    notes: `OTP sent | amount=${amount}`,
    rawResponse: bank.raw,
    meta,
  });

  return {
    success: true,
    message: "تم إرسال كود OTP للعميل",
    sessionID,
    amount,
  };
}

function handleOnlineConfTrans(e) {
  const sessionID = getParam(e, "sessionID", "").trim();
  const otp = getParam(e, "otp", getParam(e, "confirmationPin", "")).trim();
  const customerMobile = normalizeCustomerMobile(getParam(e, "customerMobile", ""));
  const amount = normalizeAmount(
    getParam(e, "decimalAmount") ||
    getParam(e, "amount") ||
    getParam(e, "totalAmount")
  );
  const meta = getMeta(e);

  if (!sessionID || !otp) {
    return failAndLog("onlineConfTrans", meta, "missing sessionID or otp", {
      customerMobile,
      amount,
      sessionID,
    });
  }

  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ',
    'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ',
    'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    '<soap:Body>',
    '<OnlineConfTrans xmlns="http://tempuri.org/">',
    '<Mobile>' + escapeXml(CONFIG.MERCHANT_MOBILE) + '</Mobile>',
    '<Pin>' + escapeXml(otp) + '</Pin>',
    '<sessionID>' + escapeXml(sessionID) + '</sessionID>',
    '<PW>' + escapeXml(CONFIG.SERVICE_PASSWORD) + '</PW>',
    '</OnlineConfTrans>',
    '</soap:Body>',
    '</soap:Envelope>',
  ].join("");

  const bank = callBank("OnlineConfTrans", xml);
  const result = extractTag(bank.raw, "OnlineConfTransResult");
  const fault = extractTag(bank.raw, "faultstring");
  const ok = /(^|\W)OK(\W|$)/i.test(String(result || "").trim());

  logTransaction({
    action: "onlineConfTrans",
    status: ok ? "confirmed" : "failed_confirm",
    customerMobile,
    amount,
    sessionID,
    resultCode: result || fault || "",
    notes: ok ? "Payment confirmed" : `Confirm failed: ${fault || result || "unknown"}`,
    rawResponse: bank.raw,
    meta,
  });

  if (ok) {
    notifyTelegramPaymentSuccess({
      customerMobile,
      amount,
      sessionID,
      resultCode: result,
      meta,
    });
  }

  if (bank.statusCode !== 200) {
    return {
      success: false,
      message: `HTTP Error ${bank.statusCode}`,
      rawResponse: bank.raw,
    };
  }

  if (fault) {
    return { success: false, message: fault, rawResponse: bank.raw };
  }

  return ok
    ? { success: true, message: "تم الدفع بنجاح", rawResponse: bank.raw }
    : { success: false, message: "كود التأكيد غير صحيح أو العملية مرفوضة", rawResponse: bank.raw };
}

function callBank(methodName, xml) {
  const response = UrlFetchApp.fetch(CONFIG.BANK_ENDPOINT, {
    method: "post",
    contentType: "text/xml; charset=utf-8",
    payload: xml,
    muteHttpExceptions: true,
    headers: { SOAPAction: `http://tempuri.org/${methodName}` },
  });

  return {
    statusCode: response.getResponseCode(),
    raw: response.getContentText(),
  };
}

function getSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }

  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty("SANIAH_SPREADSHEET_ID");

  if (existingId) {
    return SpreadsheetApp.openById(existingId);
  }

  const ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  props.setProperty("SANIAH_SPREADSHEET_ID", ss.getId());
  return ss;
}

function getSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      "date",
      "transactionId",
      "action",
      "donorName",
      "donorPhone",
      "paymentMethod",
      "customerMobile",
      "amount",
      "quantity",
      "unitPrice",
      "mosque",
      "mosqueAddress",
      "mosqueLocation",
      "status",
      "sessionID",
      "resultCode",
      "notes",
      "rawResponse",
    ]);
  }

  return sheet;
}

function logTransaction(entry) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const meta = entry.meta || {};
    getSheet().appendRow([
      new Date(),
      meta.transactionId || "",
      entry.action || "",
      meta.donorName || "",
      meta.donorPhone || "",
      meta.paymentMethod || "",
      entry.customerMobile || "",
      entry.amount || "",
      meta.quantity || "",
      meta.unitPrice || "",
      meta.mosque || meta.meterNumber || "",
      meta.mosqueAddress || "",
      meta.mosqueLocation || "",
      entry.status || "",
      entry.sessionID || "",
      entry.resultCode || "",
      entry.notes || "",
      entry.rawResponse || "",
    ]);
  } catch (err) {
    Logger.log(`logTransaction error: ${err.message}`);
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {
      Logger.log(`lock release error: ${err.message}`);
    }
  }
}

function failAndLog(action, meta, message, values) {
  logTransaction({
    action,
    status: "failed",
    customerMobile: values.customerMobile || "",
    amount: values.amount || "",
    sessionID: values.sessionID || "",
    resultCode: "",
    notes: message,
    rawResponse: "",
    meta,
  });

  return { success: false, message };
}

function handleTestTelegram() {
  const sent = sendTelegramMessage([
    "✅ اختبار إشعار سقيا",
    "",
    "إذا وصلتك هذه الرسالة فإعدادات تليجرام تعمل بشكل صحيح.",
    `وقت الاختبار: ${new Date().toLocaleString("en-GB", { timeZone: "Africa/Tripoli" })}`,
  ].join("\n"));

  return sent;
}

function notifyTelegramPaymentSuccess(entry) {
  try {
    const meta = entry.meta || {};
    const lines = [
      "✅ عملية دفع ناجحة",
      "",
      `رقم العملية: ${meta.transactionId || "-"}`,
      `المتبرع: ${meta.donorName || "-"}`,
      `رقم هاتف المتبرع: ${meta.donorPhone || "-"}`,
      `رقم أدفع لي: ${entry.customerMobile || "-"}`,
      `طريقة الدفع: ${meta.paymentMethod || "أدفع لي"}`,
      `المبلغ: ${entry.amount || "-"} دينار`,
      `عدد الكراتين: ${meta.quantity || "-"}`,
      `سعر الكرتونة: ${meta.unitPrice || "-"}`,
      "",
      `المسجد: ${meta.mosque || meta.meterNumber || "-"}`,
      `عنوان المسجد: ${meta.mosqueAddress || "-"}`,
      `موقع المسجد: ${meta.mosqueLocation || "-"}`,
      "",
      `جلسة الدفع: ${entry.sessionID || "-"}`,
      `نتيجة المصرف: ${entry.resultCode || "OK"}`,
      `وقت العملية: ${new Date().toLocaleString("en-GB", { timeZone: "Africa/Tripoli" })}`,
    ];

    const sent = sendTelegramMessage(lines.join("\n"));

    if (!sent.success) {
      Logger.log(`telegram notify failed: ${sent.message}`);
    }
  } catch (err) {
    Logger.log(`telegram notify error: ${err.message}`);
  }
}

function sendTelegramMessage(text) {
  const telegram = getTelegramConfig();

  if (!telegram.botToken || !telegram.chatId) {
    return {
      success: false,
      message: "missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in Script Properties",
    };
  }

  try {
    const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${telegram.botToken}/sendMessage`, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        chat_id: telegram.chatId,
        text,
        disable_web_page_preview: false,
      }),
    });

    const statusCode = response.getResponseCode();
    const raw = response.getContentText();
    let body = {};

    try {
      body = JSON.parse(raw);
    } catch (err) {
      body = { raw };
    }

    return {
      success: statusCode === 200 && body.ok === true,
      statusCode,
      message: body.description || (body.ok ? "sent" : "telegram request failed"),
      telegramResponse: body,
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || String(err),
    };
  }
}

function getTelegramConfig() {
  const props = PropertiesService.getScriptProperties();

  return {
    botToken: props.getProperty("TELEGRAM_BOT_TOKEN") || CONFIG.TELEGRAM_BOT_TOKEN,
    chatId: props.getProperty("TELEGRAM_CHAT_ID") || CONFIG.TELEGRAM_CHAT_ID,
  };
}

function getMeta(e) {
  return {
    donorName: getParam(e, "donorName"),
    donorPhone: getParam(e, "donorPhone"),
    transactionId: getParam(e, "transactionId"),
    paymentMethod: getParam(e, "paymentMethod"),
    quantity: getParam(e, "quantity"),
    unitPrice: getParam(e, "unitPrice"),
    mosque: getParam(e, "mosque") || getParam(e, "meterNumber"),
    meterNumber: getParam(e, "meterNumber"),
    mosqueAddress: getParam(e, "mosqueAddress"),
    mosqueLocation: getParam(e, "mosqueLocation"),
  };
}

function getParam(e, key, fallback = "") {
  return e && e.parameter && e.parameter[key] !== undefined
    ? String(e.parameter[key])
    : fallback;
}

function jsonp(callback, obj) {
  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(obj)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function normalizeAmount(value) {
  const raw = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return "";
  return String(num);
}

function normalizeCustomerMobile(value) {
  const raw = String(value || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const digits = raw.replace(/\D/g, "");

  if (/^2189\d{8}$/.test(digits)) return `+${digits}`;
  if (/^9\d{8}$/.test(digits)) return `+218${digits}`;

  return raw.trim();
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractTag(xml, tag) {
  const match = String(xml || "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function mapBankError(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return ERROR_MESSAGES[normalized] || "";
}

function isValidSessionID(value) {
  const sessionID = String(value || "").trim();
  if (!sessionID) return false;
  if (mapBankError(sessionID)) return false;
  if (sessionID.length < 8) return false;
  return true;
}
