import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BANK_TRANSFER_INFO,
  buildBankTransferWhatsappLink,
  buildBankTransferWhatsappMessage,
} from "../lib/bankTransfer";

export default function BankTransferConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [accountCopied, setAccountCopied] = useState(false);
  const [ibanCopied, setIbanCopied] = useState(false);

  useEffect(() => {
    if (!state?.transactionId) navigate("/donate");
  }, [navigate, state]);

  if (!state) return null;

  const bankInfo = state.bankInfo || BANK_TRANSFER_INFO;
  const whatsappMessage = state.whatsappMessage || buildBankTransferWhatsappMessage(state);
  const whatsappLink = state.whatsappLink || buildBankTransferWhatsappLink(whatsappMessage);

  const copyValue = async (value, setter) => {
    try {
      await navigator.clipboard.writeText(value);
      setter(true);
      window.setTimeout(() => setter(false), 1800);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div style={s.header}>
          <span className="section-tag">تم التسجيل</span>
          <h1 className="section-title">
            <span>تم تسجيل طلب التبرع بنجاح</span>
          </h1>
          <p style={s.subtitle}>
            الرجاء تحويل المبلغ إلى الحساب البنكي الموضح أدناه، ثم إرسال صورة الحوالة عبر واتساب مع رقم العملية.
          </p>
        </div>

        <div className="card" style={s.card}>
          <div style={s.warningBox}>
            لن يتم اعتماد التبرع إلا بعد مراجعة الحوالة وتأكيدها من الإدارة.
          </div>

          <div style={s.sectionBox}>
            <h2 style={s.boxTitle}>بيانات العملية</h2>
            <InfoRow label="رقم العملية" value={state.transactionId} dir="ltr" />
            <InfoRow label="الاسم" value={state.donorName} />
            <InfoRow label="واتساب" value={state.phone || `+218${state.whatsapp || ""}`} dir="ltr" />
            <InfoRow label="المبلغ" value={`${state.amount} دينار`} strong />
            <InfoRow label="عدد الكراتين" value={state.quantity} />
            <InfoRow label="سعر الكرتونة" value={`${Number(state.unitPrice || 0).toFixed(2)} دينار`} />
            <InfoRow label="المسجد/التوزيع" value={state.mosque} />
            <InfoRow label="العنوان" value={state.mosqueAddress} />
            <InfoRow label="نوع التوزيع" value={state.distributionType} dir="ltr" />
          </div>

          <div style={s.sectionBox}>
            <h2 style={s.boxTitle}>بيانات الحساب</h2>
            <InfoRow label="المصرف" value={bankInfo.bankName} />
            <InfoRow label="صاحب الحساب" value={bankInfo.accountName} />
            <InfoRow
              label="رقم الحساب"
              value={bankInfo.accountNumber}
              dir="ltr"
              copyLabel={accountCopied ? "تم النسخ ✓" : "نسخ"}
              onCopy={() => copyValue(bankInfo.accountNumber, setAccountCopied)}
            />
            {bankInfo.iban && (
              <InfoRow
                label="IBAN"
                value={bankInfo.iban}
                dir="ltr"
                copyLabel={ibanCopied ? "تم النسخ ✓" : "نسخ"}
                onCopy={() => copyValue(bankInfo.iban, setIbanCopied)}
              />
            )}
          </div>

          <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn-primary" style={s.whatsappButton}>
            إرسال صورة الحوالة عبر واتساب
          </a>

          <p style={s.note}>سيتم فتح واتساب برسالة جاهزة. أرفق صورة الحوالة يدوياً بعد فتح المحادثة.</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, dir, strong, copyLabel, onCopy }) {
  return (
    <div style={s.infoRow}>
      <span>{label}</span>
      <span style={s.valueWrap}>
        {onCopy && (
          <button type="button" onClick={onCopy} style={s.copyBtn}>
            {copyLabel}
          </button>
        )}
        <strong dir={dir} style={strong ? s.strongValue : undefined}>
          {value || "-"}
        </strong>
      </span>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 640, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "2rem" },
  subtitle: { color: "var(--text-muted)", lineHeight: 1.9, marginTop: "0.6rem" },
  card: { padding: "2.2rem" },
  warningBox: {
    color: "var(--text-muted)",
    background: "rgba(255,193,7,0.08)",
    border: "1px solid rgba(255,193,7,0.18)",
    borderRadius: 12,
    lineHeight: 1.8,
    marginBottom: "1rem",
    padding: "0.85rem 1rem",
    textAlign: "center",
  },
  sectionBox: {
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    padding: "1rem",
    marginBottom: "1rem",
  },
  boxTitle: {
    color: "var(--white)",
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1rem",
    margin: "0 0 0.7rem",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    color: "var(--text-muted)",
    fontSize: "0.9rem",
    padding: "0.45rem 0",
    flexWrap: "wrap",
  },
  valueWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.55rem",
    color: "var(--white)",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  strongValue: { color: "var(--cyan)" },
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
  whatsappButton: {
    display: "block",
    textAlign: "center",
    textDecoration: "none",
    marginTop: "1rem",
  },
  note: {
    color: "var(--text-muted)",
    lineHeight: 1.8,
    marginTop: "0.8rem",
    textAlign: "center",
  },
};
