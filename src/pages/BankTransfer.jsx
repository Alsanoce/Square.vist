import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { callEdfaaly } from "../lib/edfaalyApi";
import {
  BANK_TRANSFER_INFO,
  buildBankTransferWhatsappLink,
  buildBankTransferWhatsappMessage,
  createBankTransferTransactionId,
  getBankTransferDonationDetails,
} from "../lib/bankTransfer";

const BANK_LOGO = "/payment-icons/commerce-development-bank.jpeg";
const REQUEST_ERROR = "حدث خطأ أثناء تسجيل طلب الحوالة، يرجى المحاولة مرة أخرى أو التواصل مع الإدارة.";
const BACKEND_ACTION_ERROR =
  "خادم الدفع لم يتم تحديثه بعد. يرجى نشر نسخة Google Apps Script الجديدة ثم المحاولة مرة أخرى.";

export default function BankTransfer() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [bankTransactionId] = useState(() => state?.bankTransferTransactionId || createBankTransferTransactionId());

  useEffect(() => {
    if (!state?.phone || !state?.mosque) navigate("/donate");
  }, [navigate, state]);

  if (!state) return null;

  const donationDetails = getBankTransferDonationDetails(state);
  const confirmationDetails = {
    ...state,
    ...donationDetails,
    transactionId: bankTransactionId,
    paymentMethod: "حوالة مصرفية",
    country: "ليبيا",
    city: "بنغازي",
    status: "بانتظار صورة الحوالة",
    receiptSource: "WhatsApp",
  };
  const whatsappMessage = buildBankTransferWhatsappMessage({
    ...confirmationDetails,
    phone: state.phone || `+218${state.whatsapp || ""}`,
  });
  const whatsappLink = buildBankTransferWhatsappLink(whatsappMessage);

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(BANK_TRANSFER_INFO.accountNumber);
      setAccountCopied(true);
      window.setTimeout(() => setAccountCopied(false), 1800);
    } catch (error) {
      setMessage({ type: "error", text: "تعذر نسخ رقم الحساب. انسخه يدوياً من الحقل." });
    }
  };

  const submitBankTransferRequest = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const payload = {
        action: "createBankTransferRequest",
        transactionId: bankTransactionId,
        donorName: state.donorName || "",
        phone: state.phone || "",
        whatsapp: state.whatsapp || "",
        amount: state.amount || "",
        quantity: state.quantity || "",
        unitPrice: state.unitPrice || "",
        mosque: donationDetails.mosque,
        mosqueAddress: donationDetails.mosqueAddress,
        mosqueLocation: donationDetails.mosqueLocation,
        distributionType: donationDetails.distributionType,
        paymentMethod: "حوالة مصرفية",
        country: "ليبيا",
        city: "بنغازي",
        status: "بانتظار صورة الحوالة",
        receiptSource: "WhatsApp",
        createdAt: new Date().toISOString(),
        whatsappMessage,
        whatsappLink,
      };

      const response = await callEdfaaly("createBankTransferRequest", payload);

      if (!response?.success) {
        if (response?.message === "invalid action") {
          throw new Error(BACKEND_ACTION_ERROR);
        }
        throw new Error(response?.message || REQUEST_ERROR);
      }

      navigate("/payment/bank/confirmation", {
        state: {
          ...confirmationDetails,
          whatsappMessage,
          whatsappLink,
          bankInfo: BANK_TRANSFER_INFO,
        },
      });
    } catch (error) {
      console.error("Bank transfer request failed:", error);
      setMessage({ type: "error", text: error.message === BACKEND_ACTION_ERROR ? BACKEND_ACTION_ERROR : REQUEST_ERROR });
      setIsLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div style={s.header}>
          <span className="section-tag">الدفع</span>
          <h1 className="section-title">
            <span>حوالة مصرفية</span>
          </h1>
        </div>

        <div className="card" style={s.card}>
          <div style={s.bankHeader}>
            <img src={BANK_LOGO} alt={BANK_TRANSFER_INFO.bankName} style={s.bankLogo} />
            <div>
              <strong style={s.bankName}>{BANK_TRANSFER_INFO.bankName}</strong>
              <span style={s.bankCaption}>بيانات التحويل المصرفي</span>
            </div>
          </div>

          <p style={s.instruction}>
            الرجاء تحويل المبلغ إلى الحساب البنكي الموضح أدناه، ثم إرسال صورة الحوالة عبر واتساب مع رقم العملية.
          </p>

          <div style={s.amountBox}>
            <span>قيمة الدفع</span>
            <strong>{state.amount} دينار</strong>
          </div>

          <div style={s.detailsBox}>
            <DetailRow label="رقم العملية" value={bankTransactionId} dir="ltr" />
            <DetailRow label="المصرف" value={BANK_TRANSFER_INFO.bankName} />
            <DetailRow label="صاحب الحساب" value={BANK_TRANSFER_INFO.accountName} />
            <DetailRow
              label="رقم الحساب"
              value={BANK_TRANSFER_INFO.accountNumber}
              dir="ltr"
              copyable
              copied={accountCopied}
              onCopy={copyAccountNumber}
            />
          </div>

          <p style={s.note}>لن يتم اعتماد التبرع إلا بعد مراجعة الحوالة وتأكيدها من الإدارة.</p>

          {message && (
            <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}>
              {message.text}
            </div>
          )}

          <button className="btn-primary" onClick={submitBankTransferRequest} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" /> جاري تسجيل طلب الحوالة...
              </>
            ) : (
              "تسجيل طلب الحوالة"
            )}
          </button>

          <button type="button" onClick={() => navigate("/payment", { state })} style={s.backBtn}>
            العودة لاختيار طريقة الدفع
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, dir, copyable, copied, onCopy }) {
  return (
    <div style={s.detailRow}>
      <span>{label}</span>
      <span style={s.detailValueWrap}>
        {copyable && (
          <button
            type="button"
            onClick={onCopy}
            style={s.copyBtn}
            title="نسخ رقم الحساب"
            aria-label="نسخ رقم الحساب"
          >
            {copied ? "تم النسخ ✓" : "نسخ"}
          </button>
        )}
        <strong dir={dir}>{value}</strong>
      </span>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 540, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "2rem" },
  card: { padding: "2.2rem" },
  bankHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.9rem",
    marginBottom: "1.2rem",
  },
  bankLogo: {
    width: 72,
    height: 72,
    objectFit: "contain",
    borderRadius: 14,
    background: "#fff",
    padding: "0.35rem",
    flexShrink: 0,
  },
  bankName: {
    display: "block",
    color: "var(--white)",
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1.05rem",
  },
  bankCaption: {
    display: "block",
    color: "var(--text-muted)",
    fontSize: "0.82rem",
    marginTop: "0.15rem",
  },
  instruction: {
    color: "var(--text-muted)",
    lineHeight: 1.9,
    marginBottom: "1rem",
    textAlign: "center",
  },
  amountBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    color: "var(--text-muted)",
    padding: "1rem",
    marginBottom: "1rem",
  },
  detailsBox: {
    display: "grid",
    gap: "0.45rem",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    padding: "1rem",
    marginBottom: "1.1rem",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    color: "var(--text-muted)",
    fontSize: "0.9rem",
    flexWrap: "wrap",
  },
  detailValueWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.55rem",
    color: "var(--white)",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  copyBtn: {
    minHeight: 32,
    borderRadius: 10,
    border: "1px solid rgba(0,212,255,0.28)",
    background: "rgba(0,212,255,0.08)",
    color: "var(--cyan)",
    cursor: "pointer",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.78rem",
    fontWeight: 800,
    padding: "0.3rem 0.65rem",
  },
  note: {
    color: "var(--text-muted)",
    background: "rgba(255,193,7,0.08)",
    border: "1px solid rgba(255,193,7,0.18)",
    borderRadius: 12,
    lineHeight: 1.8,
    marginBottom: "1rem",
    padding: "0.75rem 0.9rem",
    textAlign: "center",
  },
  backBtn: {
    display: "block",
    width: "100%",
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.9rem",
    cursor: "pointer",
    marginTop: "0.8rem",
    padding: "0.5rem",
  },
};
