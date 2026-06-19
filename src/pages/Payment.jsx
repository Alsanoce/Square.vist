import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const METHODS = [
  {
    id: "edfaaly",
    title: "أدفع لي",
    description: "أدخل رقم هاتف أدفع لي ثم انتقل إلى OTP.",
    icon: "/payment-icons/adfa3ly.png",
    path: "/payment/edfaaly",
  },
  {
    id: "yussor",
    title: "يسر باي",
    description: "أدخل رقم البطاقة وسيتم إرسال كود OTP لإتمام الدفع.",
    icon: "/payment-icons/yussor-pay.jpg",
    path: "/payment/yussor",
    badge: "جديد",
  },
  {
    id: "mobicash",
    title: "موبي كاش",
    description: "أدخل رقم البطاقة وسنتواصل معك لإتمام الدفع.",
    icon: "/payment-icons/mobicash.png",
    path: "/payment/mobicash",
  },
  {
    id: "bank",
    title: "تحويل مصرفي",
    description: "نسجل طلبك ونتواصل معك ببيانات التحويل المصرفي.",
    icon: "/payment-icons/commerce-development-bank.jpeg",
    path: "/payment/bank",
  },
];

export default function Payment() {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state?.phone || !state?.mosque) navigate("/donate");
  }, [navigate, state]);

  const goToMethod = (method) => {
    navigate(method.path, { state });
  };

  if (!state) return null;

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div style={s.header}>
          <span className="section-tag">الدفع</span>
          <h1 className="section-title">
            اختر <span>طريقة الدفع</span>
          </h1>
          <p style={s.subtitle}>راجع بيانات التبرع ثم اختر الطريقة المناسبة لك.</p>
        </div>

        <div className="card" style={s.card}>
          <div style={s.summary}>
            <div style={s.summaryRow}><span>المتبرع</span><strong>{state.donorName}</strong></div>
            <div style={s.summaryRow}><span>واتساب</span><strong dir="ltr">+218{state.whatsapp}</strong></div>
            <div style={s.summaryRow}><span>المسجد</span><strong>{state.mosque}</strong></div>
            <div style={s.summaryRow}><span>عدد الكراتين</span><strong>{state.quantity}</strong></div>
            <div style={s.summaryTotal}><span>الإجمالي</span><strong>{state.amount} دينار</strong></div>
          </div>

          <div style={s.methods}>
            {METHODS.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => goToMethod(method)}
                className="payment-method-button"
                style={s.methodButton}
                aria-label={`الدفع عبر ${method.title}`}
              >
                <img src={method.icon} alt={`شعار ${method.title}`} style={s.methodIcon} />
                <span className="payment-method-copy" style={s.methodText}>
                  <span style={s.methodTitleRow}>
                    <strong>{method.title}</strong>
                    {method.badge && <span style={s.methodBadge}>{method.badge}</span>}
                  </span>
                  <span>{method.description}</span>
                </span>
              </button>
            ))}
          </div>

          <button type="button" onClick={() => navigate("/donate")} style={s.backBtn}>
            العودة لتعديل البيانات
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 620, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "2rem" },
  subtitle: { color: "var(--text-muted)", fontSize: "0.97rem", marginTop: "0.5rem" },
  card: { padding: "2.2rem" },
  summary: {
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    padding: "1rem",
    marginBottom: "1.4rem",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    color: "var(--text-muted)",
    fontSize: "0.9rem",
    padding: "0.45rem 0",
  },
  summaryTotal: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    color: "var(--white)",
    borderTop: "1px solid rgba(0,212,255,0.15)",
    marginTop: "0.5rem",
    paddingTop: "0.8rem",
  },
  methods: { display: "grid", gap: "0.8rem" },
  methodButton: {
    width: "100%",
    textAlign: "right",
    display: "flex",
    alignItems: "center",
    gap: "0.9rem",
    border: "1px solid rgba(0,212,255,0.18)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    color: "var(--white)",
    padding: "1rem",
    cursor: "pointer",
    fontFamily: "'Tajawal', sans-serif",
  },
  methodIcon: {
    width: 56,
    height: 56,
    objectFit: "contain",
    borderRadius: 10,
    background: "rgba(255,255,255,0.92)",
    padding: "0.35rem",
    flexShrink: 0,
  },
  methodText: {
    display: "grid",
    gap: "0.3rem",
  },
  methodTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.55rem",
    flexWrap: "wrap",
  },
  methodBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 22,
    padding: "0.15rem 0.55rem",
    borderRadius: 999,
    background: "rgba(0,200,150,0.14)",
    border: "1px solid rgba(0,200,150,0.3)",
    color: "var(--success)",
    fontSize: "0.72rem",
    fontWeight: 800,
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
