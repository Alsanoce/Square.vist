export const BANK_TRANSFER_INFO = {
  bankName: import.meta.env.VITE_BANK_NAME || "مصرف التجارة والتنمية",
  accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || "السنوسي سعد جمعة",
  accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "0015247166001",
  iban: import.meta.env.VITE_BANK_IBAN || "",
  adminWhatsapp: import.meta.env.VITE_ADMIN_WHATSAPP || "218915100403",
};

export function createBankTransferTransactionId() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `BT-SANIAH-${date}-${time}-${suffix}`;
}

export function getBankTransferDonationDetails(state = {}) {
  const quantity = Number(state.quantity || 0);
  const isNearestMosque = quantity < 10;

  return {
    distributionType: isNearestMosque ? "nearest_mosque" : "selected_mosque",
    mosque: isNearestMosque ? "أقرب مسجد داخل بنغازي" : state.mosque || "",
    mosqueAddress: isNearestMosque
      ? "يتم التوزيع على أقرب مسجد داخل مدينة بنغازي"
      : state.mosqueAddress || "",
    mosqueLocation: isNearestMosque ? "" : state.mosqueLocation || "",
  };
}

export function buildBankTransferWhatsappMessage(details) {
  return [
    "السلام عليكم، هذه صورة حوالة التبرع لمشروع سقيا ماء.",
    "",
    `رقم العملية: ${details.transactionId}`,
    `الاسم: ${details.donorName}`,
    `رقم الواتساب: ${details.phone}`,
    `المبلغ: ${details.amount} دينار`,
    `عدد الكراتين: ${details.quantity}`,
    `سعر الكرتونة: ${details.unitPrice} دينار`,
    `المسجد/التوزيع: ${details.mosque}`,
    `العنوان: ${details.mosqueAddress}`,
    `نوع التوزيع: ${details.distributionType}`,
    "طريقة الدفع: حوالة مصرفية",
    "الحالة: بانتظار مراجعة الحوالة",
    "",
    "سأرفق صورة الحوالة الآن.",
  ].join("\n");
}

export function buildBankTransferWhatsappLink(message) {
  return `https://wa.me/${BANK_TRANSFER_INFO.adminWhatsapp}?text=${encodeURIComponent(message)}`;
}
