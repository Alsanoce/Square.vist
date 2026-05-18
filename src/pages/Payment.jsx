import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const METHODS = [
  {
    id: "edfaaly",
    title: "أدفع لي",
    description: "دفع إلكتروني مباشر مع رسالة تأكيد OTP.",
    icon: "/payment-icons/adfa3ly.png",
  },
  {
    id: "mobicash",
    title: "موبي كاش",
    description: "نسجل طلبك ونتواصل معك على واتساب لإتمام الدفع.",
    icon: "/payment-icons/mobicash.png",
  },
  {
    id: "bank",
    title: "تحويل مصرفي",
    description: "نسجل طلبك ونتواصل معك ببيانات التحويل المصرفي.",
  },
];

export default function Payment() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("edfaaly");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!state?.phone || !state?.mosque) navigate("/donate");
  }, [navigate, state]);

  const saveManualRequest = async (method) => {
    await addDoc(collection(db, "payment_requests"), {
      donorName: state.donorName,
      phone: state.phone,
      whatsapp: state.whatsapp,
      amount: state.amount,
      quantity: state.quantity,
      mosque: state.mosque,
      mosqueAddress: state.mosqueAddress,
      mosqueLocation: state.mosqueLocation,
      paymentMethod: method,
      status: "بانتظار الدفع",
      country: "ليبيا",
      timestamp: new Date(),
    });
  };

  const startEdfaalyPayment = async () => {
    const response = await axios.post(
      "https://api.saniah.ly/api/pay",
      {
        customer: state.phone,
        amount: state.amount,
        mosque: state.mosque,
        quantity: state.quantity,
      },
      { headers: { "X-Request-ID": uuidv4() }, timeout: 20000 }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || "تعذر بدء الدفع");
    }

    navigate("/confirm", {
      state: {
        ...state,
        sessionID: response.data.sessionID,
        paymentMethod: "أدفع لي",
      },
    });
  };

  const handlePayment = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setMessage(null);

    try {
      if (selected === "edfaaly") {
        await startEdfaalyPayment();
        return;
      }

      const methodName = selected === "mobicash" ? "موبي كاش" : "تحويل مصرفي";
      await saveManualRequest(methodName);
      setMessage({
        type: "success",
        text: `تم تسجيل طلبك عبر ${methodName}. سنتواصل معك على واتساب لإتمام الدفع.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || err.message || "تعذر إكمال العملية. حاول مرة أخرى.",
      });
    } finally {
      setIsLoading(false);
    }
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
                onClick={() => setSelected(method.id)}
                style={{
                  ...s.methodButton,
                  ...(selected === method.id ? s.methodButtonActive : {}),
                }}
              >
                {method.icon ? (
                  <img src={method.icon} alt="" style={s.methodIcon} />
                ) : (
                  <span style={s.bankIcon}>ح</span>
                )}
                <span style={s.methodText}>
                  <strong>{method.title}</strong>
                  <span>{method.description}</span>
                </span>
              </button>
            ))}
          </div>

          {message && (
            <div className={`alert ${message.type === "error" ? "alert-danger" : "alert-success"}`}>
              {message.text}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handlePayment}
            disabled={isLoading}
            style={{ marginTop: "1rem" }}
          >
            {isLoading ? <><span className="spinner" /> جاري المعالجة...</> : "إكمال الدفع"}
          </button>

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
  bankIcon: {
    width: 56,
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "rgba(0,212,255,0.1)",
    border: "1px solid rgba(0,212,255,0.24)",
    color: "var(--cyan)",
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1.4rem",
    fontWeight: 900,
    flexShrink: 0,
  },
  methodText: {
    display: "grid",
    gap: "0.3rem",
  },
  methodButtonActive: {
    borderColor: "var(--cyan)",
    boxShadow: "0 0 0 3px rgba(0,212,255,0.1)",
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
