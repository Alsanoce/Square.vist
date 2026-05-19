import { Link, useLocation } from "react-router-dom";

export default function ThankYouReceipt() {
  const { state } = useLocation();

  const receipt = {
    transactionId: state?.transactionId || "غير متوفر",
    donorName: state?.donorName || "فاعل خير",
    amount: state?.amount || "",
    quantity: state?.quantity || "",
    unitPrice: state?.unitPrice || "",
    mosque: state?.mosque || "",
    sessionID: state?.sessionID || "",
  };

  const shareText = [
    "تم التبرع عبر سقيا الخير",
    `رقم العملية: ${receipt.transactionId}`,
    receipt.quantity ? `عدد الكراتين: ${receipt.quantity}` : "",
    receipt.amount ? `المبلغ: ${receipt.amount} دينار` : "",
    receipt.mosque ? `المسجد: ${receipt.mosque}` : "",
    "https://saniah.ly",
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div className="card" style={s.card}>
          <div style={s.icon}>💧</div>
          <span className="section-tag">تم الدفع</span>
          <h1 className="section-title" style={s.title}>
            جزاك الله <span>خيرًا</span>
          </h1>
          <p style={s.subtitle}>تم استلام تبرعك بنجاح، وسيتم توصيل كراتين الماء للمسجد المحدد.</p>

          <div style={s.receipt}>
            <ReceiptRow label="رقم العملية" value={receipt.transactionId} dir="ltr" />
            <ReceiptRow label="المتبرع" value={receipt.donorName} />
            {receipt.mosque && <ReceiptRow label="المسجد" value={receipt.mosque} />}
            {receipt.quantity && <ReceiptRow label="عدد الكراتين" value={`${receipt.quantity} كرتونة`} />}
            {receipt.unitPrice && (
              <ReceiptRow label="سعر الكرتونة" value={`${Number(receipt.unitPrice).toFixed(2)} دينار`} />
            )}
            {receipt.amount && <ReceiptRow label="الإجمالي" value={`${receipt.amount} دينار`} strong />}
            {receipt.sessionID && <ReceiptRow label="جلسة الدفع" value={receipt.sessionID} dir="ltr" />}
          </div>

          <div style={s.actions}>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn-primary" style={s.action}>
              مشاركة الإيصال
            </a>
            <Link to="/donate" className="btn-secondary" style={s.action}>
              تبرع جديد
            </Link>
          </div>

          <Link to="/" style={s.homeLink}>
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, strong = false, dir }) {
  return (
    <div style={s.row}>
      <span>{label}</span>
      <strong style={strong ? s.strongValue : undefined} dir={dir}>
        {value}
      </strong>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 560, margin: "0 auto", textAlign: "center" },
  card: { padding: "3rem 2rem" },
  icon: { fontSize: "4rem", marginBottom: "1rem" },
  title: { marginBottom: "0.8rem" },
  subtitle: {
    color: "var(--text-muted)",
    lineHeight: 1.9,
    marginBottom: "1.6rem",
  },
  receipt: {
    display: "grid",
    gap: "0.35rem",
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    padding: "1rem",
    marginBottom: "1.5rem",
    textAlign: "right",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    color: "var(--text-muted)",
    fontSize: "0.9rem",
    padding: "0.35rem 0",
  },
  strongValue: { color: "var(--cyan)", fontSize: "1rem" },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.8rem",
    marginBottom: "1rem",
  },
  action: { textDecoration: "none" },
  homeLink: {
    display: "inline-block",
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "0.9rem",
  },
};
