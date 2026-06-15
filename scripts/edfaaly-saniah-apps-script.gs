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
 *
 * Telegram setup:
 * Apps Script > Project Settings > Script Properties
 * TELEGRAM_BOT_TOKEN = your_bot_token
 * TELEGRAM_CHAT_ID = your_chat_id_or_channel
 */

const CONFIG = {
  // If empty, the script creates a new spreadsheet automatically and stores its ID in Script Properties.
  SPREADSHEET_ID: "",
  SPREADSHEET_NAME: "سقيا ماء - عمليات الدفع",
  SHEET_NAME: "edfaly pyment",
  BANK_TRANSFER_SHEET_NAME: "BankTransfers",

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

const BANK_TRANSFER_HEADERS = [
  "Timestamp",
  "Transaction ID",
  "Donor Name",
  "Phone",
  "WhatsApp",
  "Amount",
  "Quantity",
  "Unit Price",
  "Mosque",
  "Mosque Address",
  "Mosque Location",
  "Distribution Type",
  "Payment Method",
  "Status",
  "Receipt Source",
  "WhatsApp Message",
  "WhatsApp Link",
  "Admin Notes",
  "Confirmed At",
  "Telegram Sent",
];

function doGet(e) {
  const callback = getParam(e, "callback", "");

  try {
    const action = getParam(e, "action", "").trim();
    let result;

    if (action === "doPTrans") {
      result = handleDoPTrans(e);
    } else if (action === "onlineConfTrans") {
      result = handleOnlineConfTrans(e);
    } else if (action === "testTelegram") {
      result = handleTestTelegram();
    } else if (action === "telegramStatus") {
      result = handleTelegramStatus();
    } else if (action === "createBankTransferRequest") {
      result = handleCreateBankTransferRequest(e);
    } else if (action === "saveBankTransfer") {
      result = handleCreateBankTransferRequest(e);
    } else if (action === "getPublicStats") {
      result = handleGetPublicStats();
    } else if (action === "health") {
      result = { success: true, message: "Saniah payment API is running" };
    } else {
      result = { success: false, message: "invalid action" };
    }

    return outputResponse(callback, result);
  } catch (err) {
    return outputResponse(callback, { success: false, message: err.message || String(err) });
  }
}

function handleGetPublicStats() {
  try {
    const acc = {
      cartonsDistributed: 0,
      mosques: {},
      donors: {},
      unitPrices: [],
    };

    collectStatsFromEdfaalySheet(acc);
    collectStatsFromBankTransferSheet(acc);

    const cartonPrice = acc.unitPrices.length
      ? Math.min.apply(null, acc.unitPrices)
      : 6;

    return {
      success: true,
      stats: {
        cartonsDistributed: acc.cartonsDistributed,
        mosquesServed: Object.keys(acc.mosques).length,
        donorsCount: Object.keys(acc.donors).length,
        cartonPrice,
      },
    };
  } catch (err) {
    Logger.log(`handleGetPublicStats error: ${err.message}`);
    return {
      success: false,
      message: err.message || String(err),
    };
  }
}

function collectStatsFromEdfaalySheet(acc) {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return;

  const headerMap = getHeaderMap(sheet);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  values.forEach((row) => {
    const status = getRowValue(row, headerMap, "status");
    const resultCode = getRowValue(row, headerMap, "resultCode");

    if (!isConfirmedStatus(status) && String(resultCode || "").trim().toUpperCase() !== "OK") return;

    addStatsEntry(acc, {
      quantity: getRowValue(row, headerMap, "quantity"),
      unitPrice: getRowValue(row, headerMap, "unitPrice"),
      donor: getRowValue(row, headerMap, "donorName") || getRowValue(row, headerMap, "donorPhone"),
      mosque: getRowValue(row, headerMap, "mosque"),
    });
  });
}

function collectStatsFromBankTransferSheet(acc) {
  const sheet = getBankTransferSheet();
  if (sheet.getLastRow() < 2) return;

  const headerMap = getHeaderMap(sheet);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  values.forEach((row) => {
    const status = getRowValue(row, headerMap, "Status");
    if (!isConfirmedStatus(status)) return;

    addStatsEntry(acc, {
      quantity: getRowValue(row, headerMap, "Quantity"),
      unitPrice: getRowValue(row, headerMap, "Unit Price"),
      donor: getRowValue(row, headerMap, "Donor Name") || getRowValue(row, headerMap, "Phone") || getRowValue(row, headerMap, "WhatsApp"),
      mosque: getRowValue(row, headerMap, "Mosque"),
    });
  });
}

function addStatsEntry(acc, entry) {
  const quantity = toNumber(entry.quantity);
  const unitPrice = toNumber(entry.unitPrice);
  const donor = normalizeStatsKey(entry.donor);
  const mosque = normalizeStatsKey(entry.mosque);

  if (quantity > 0) acc.cartonsDistributed += quantity;
  if (unitPrice > 0) acc.unitPrices.push(unitPrice);
  if (donor) acc.donors[donor] = true;
  if (mosque) acc.mosques[mosque] = true;
}

function getRowValue(row, headerMap, header) {
  const column = headerMap[header];
  return column ? row[column - 1] : "";
}

function isConfirmedStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return [
    "confirmed",
    "paid",
    "ok",
    "تم الدفع",
    "مؤكد",
    "تم التأكيد",
  ].indexOf(status) !== -1;
}

function normalizeStatsKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function toNumber(value) {
  const normalized = String(value || "")
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function handleCreateBankTransferRequest(e) {
  const data = {
    timestamp: new Date(),
    transactionId: getParam(e, "transactionId"),
    donorName: getParam(e, "donorName"),
    phone: getParam(e, "phone") || getParam(e, "donorPhone"),
    whatsapp: getParam(e, "whatsapp") || getParam(e, "donorPhone"),
    amount: normalizeAmount(getParam(e, "amount")),
    quantity: getParam(e, "quantity"),
    unitPrice: getParam(e, "unitPrice"),
    mosque: getParam(e, "mosque"),
    mosqueAddress: getParam(e, "mosqueAddress"),
    mosqueLocation: getParam(e, "mosqueLocation"),
    distributionType: getParam(e, "distributionType"),
    paymentMethod: getParam(e, "paymentMethod", "حوالة مصرفية"),
    status: "بانتظار صورة الحوالة",
    receiptSource: getParam(e, "receiptSource", "WhatsApp"),
    whatsappMessage: getParam(e, "whatsappMessage"),
    whatsappLink: getParam(e, "whatsappLink"),
  };

  if (!data.transactionId || !data.donorName || !(data.phone || data.whatsapp) || !data.amount || !data.quantity || !data.paymentMethod) {
    return {
      success: false,
      message: "missing bank transfer request fields",
      data,
    };
  }

  try {
    const sheet = getBankTransferSheet();
    const duplicateRow = findRowByTransactionId(sheet, data.transactionId);

    if (duplicateRow > 0) {
      return {
        success: true,
        duplicate: true,
        transactionId: data.transactionId,
        status: data.status,
        message: "طلب الحوالة مسجل مسبقاً",
      };
    }

    appendBankTransferRow(sheet, data);

    return {
      success: true,
      duplicate: false,
      transactionId: data.transactionId,
      status: data.status,
      message: "تم تسجيل طلب الحوالة المصرفية",
      sheetName: CONFIG.BANK_TRANSFER_SHEET_NAME,
    };
  } catch (err) {
    Logger.log(`handleCreateBankTransferRequest error: ${err.message}`);
    logBackendError("createBankTransferRequest", err.message || String(err));
    return {
      success: false,
      message: "تعذر تسجيل طلب الحوالة المصرفية",
      sheetName: CONFIG.BANK_TRANSFER_SHEET_NAME,
    };
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

  let telegramNotify = { success: false, message: "not attempted" };

  if (ok) {
    telegramNotify = notifyTelegramPaymentSuccess({
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
      telegramNotify,
      rawResponse: bank.raw,
    };
  }

  if (fault) {
    return { success: false, message: fault, telegramNotify, rawResponse: bank.raw };
  }

  if (ok) {
    return { success: true, message: "تم الدفع بنجاح", telegramNotify, rawResponse: bank.raw };
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

function getBankTransferSheet() {
  return getOrCreateSheet(CONFIG.BANK_TRANSFER_SHEET_NAME, BANK_TRANSFER_HEADERS);
}

function getOrCreateSheet(sheetName, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  ensureHeaders(sheet, headers);
  return sheet;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  const missingHeaders = headers.filter((header) => currentHeaders.indexOf(header) === -1);

  if (missingHeaders.length > 0) {
    sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    if (header) map[String(header).trim()] = index + 1;
  });
  return map;
}

function findRowByTransactionId(sheet, transactionId) {
  const headerMap = getHeaderMap(sheet);
  const column = headerMap["Transaction ID"];

  if (!column || sheet.getLastRow() < 2) return -1;

  const values = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getValues();
  const wanted = String(transactionId || "").trim();

  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0] || "").trim() === wanted) {
      return i + 2;
    }
  }

  return -1;
}

function appendBankTransferRow(sheet, data) {
  const headerMap = getHeaderMap(sheet);
  const row = new Array(sheet.getLastColumn()).fill("");

  setRowValue(row, headerMap, "Timestamp", data.timestamp);
  setRowValue(row, headerMap, "Transaction ID", data.transactionId);
  setRowValue(row, headerMap, "Donor Name", data.donorName);
  setRowValue(row, headerMap, "Phone", data.phone);
  setRowValue(row, headerMap, "WhatsApp", data.whatsapp);
  setRowValue(row, headerMap, "Amount", data.amount);
  setRowValue(row, headerMap, "Quantity", data.quantity);
  setRowValue(row, headerMap, "Unit Price", data.unitPrice);
  setRowValue(row, headerMap, "Mosque", data.mosque);
  setRowValue(row, headerMap, "Mosque Address", data.mosqueAddress);
  setRowValue(row, headerMap, "Mosque Location", data.mosqueLocation);
  setRowValue(row, headerMap, "Distribution Type", data.distributionType);
  setRowValue(row, headerMap, "Payment Method", data.paymentMethod);
  setRowValue(row, headerMap, "Status", data.status);
  setRowValue(row, headerMap, "Receipt Source", data.receiptSource);
  setRowValue(row, headerMap, "WhatsApp Message", data.whatsappMessage);
  setRowValue(row, headerMap, "WhatsApp Link", data.whatsappLink);
  setRowValue(row, headerMap, "Telegram Sent", "NO");

  sheet.appendRow(row);
}

function setRowValue(row, headerMap, header, value) {
  const column = headerMap[header];
  if (column) row[column - 1] = value || "";
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

function handleTelegramStatus() {
  const telegram = getTelegramConfig();

  return {
    success: Boolean(telegram.botToken && telegram.chatId),
    hasBotToken: Boolean(telegram.botToken),
    hasChatId: Boolean(telegram.chatId),
    chatId: telegram.chatId || "",
  };
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

    return sent;
  } catch (err) {
    Logger.log(`telegram notify error: ${err.message}`);
    return {
      success: false,
      message: err.message || String(err),
    };
  }
}

function handleBankTransferStatusEdit(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    if (sheet.getName() !== CONFIG.BANK_TRANSFER_SHEET_NAME) return;

    const headerMap = getHeaderMap(sheet);
    const statusColumn = headerMap["Status"];
    const telegramSentColumn = headerMap["Telegram Sent"];
    const confirmedAtColumn = headerMap["Confirmed At"];
    const adminNotesColumn = headerMap["Admin Notes"];

    if (!statusColumn || !telegramSentColumn || e.range.getColumn() !== statusColumn || e.range.getRow() < 2) return;

    const newStatus = String(e.value || e.range.getValue() || "").trim();
    if (newStatus !== "تم الدفع") return;

    const row = e.range.getRow();
    const telegramSent = String(sheet.getRange(row, telegramSentColumn).getValue() || "").trim();
    if (telegramSent === "YES") return;

    const data = getBankTransferRowData(sheet, row, headerMap);
    const sent = notifyTelegramBankTransferPaid(data);

    if (sent.success) {
      if (confirmedAtColumn) sheet.getRange(row, confirmedAtColumn).setValue(new Date());
      sheet.getRange(row, telegramSentColumn).setValue("YES");
    } else {
      const message = `Telegram failed: ${sent.message || "unknown error"}`;
      if (adminNotesColumn) sheet.getRange(row, adminNotesColumn).setValue(message);
      logBackendError("handleBankTransferStatusEdit", message);
    }
  } catch (err) {
    Logger.log(`handleBankTransferStatusEdit error: ${err.message}`);
    logBackendError("handleBankTransferStatusEdit", err.message || String(err));
  }
}

// Installable trigger recommended:
// 1. Open Apps Script.
// 2. Go to Triggers.
// 3. Add Trigger.
// 4. Choose function: handleBankTransferStatusEdit
// 5. Event source: From spreadsheet
// 6. Event type: On edit
// 7. Authorize the script.
function onEdit(e) {
  handleBankTransferStatusEdit(e);
}

function getBankTransferRowData(sheet, row, headerMap) {
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = {};

  Object.keys(headerMap).forEach((header) => {
    data[header] = values[headerMap[header] - 1];
  });

  return data;
}

function notifyTelegramBankTransferPaid(data) {
  try {
    const lines = [
      "✅ تم تأكيد دفع جديد",
      "",
      `رقم العملية: ${data["Transaction ID"] || "-"}`,
      `الاسم: ${data["Donor Name"] || "-"}`,
      `المبلغ: ${data["Amount"] || "-"} دينار`,
      `عدد الكراتين: ${data["Quantity"] || "-"}`,
      `سعر الكرتونة: ${data["Unit Price"] || "-"} دينار`,
      `المسجد/التوزيع: ${data["Mosque"] || "-"}`,
      `العنوان: ${data["Mosque Address"] || "-"}`,
      `رقم الواتساب: ${data["WhatsApp"] || data["Phone"] || "-"}`,
      "طريقة الدفع: حوالة مصرفية",
      "الحالة: تم الدفع",
    ];

    const sent = sendTelegramMessage(lines.join("\n"));

    if (!sent.success) {
      Logger.log(`bank transfer telegram failed: ${sent.message}`);
    }

    return sent;
  } catch (err) {
    Logger.log(`notifyTelegramBankTransferPaid error: ${err.message}`);
    return {
      success: false,
      message: err.message || String(err),
    };
  }
}

function sendTelegramMessage(text) {
  const telegram = getTelegramConfig();

  if (!telegram.botToken || !telegram.chatId) {
    throw new Error("Missing Telegram script properties");
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
  return {
    botToken: getScriptProperty("TELEGRAM_BOT_TOKEN") || CONFIG.TELEGRAM_BOT_TOKEN,
    chatId: getScriptProperty("TELEGRAM_CHAT_ID") || CONFIG.TELEGRAM_CHAT_ID,
  };
}

function getScriptProperty(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}

function logBackendError(source, message) {
  try {
    const sheet = getOrCreateSheet("Logs", ["Timestamp", "Source", "Message"]);
    sheet.appendRow([new Date(), source, message]);
  } catch (err) {
    Logger.log(`logBackendError failed: ${err.message}`);
  }
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

function outputResponse(callback, obj) {
  if (callback) return jsonp(callback, obj);

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
