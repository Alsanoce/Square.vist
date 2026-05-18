import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function BankTransfer() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!state?.phone || !state?.mosque) navigate("/donate");
  }, [navigate, state]);

  const saveRequest = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setMessage(null);

    try {
      await addDoc(collection(db, "payment_requests"), {
        donorName: state.donorName,
        phone: state.phone,
        whatsapp: state.whatsapp,
        amount: state.amount,
        quantity: state.quantity,
        mosque: state.mosque,
        mosqueAddress: state.mosqueAddress,
        mosqueLocation: state.mosqueLocation,
        paymentMethod: "تحويل مصرفي",
        status: "بانتظار الدفع",
        country: "ليبيا",
        timestamp: new Date(),
      });
      setMessage("تم تسجيل طلب التحويل المصرفي. سنتواصل معك على واتساب لإرسال بيانات الحساب.");
    } catch {
      setMessage("تعذر تسجيل الطلب. حاول مرة أخرى.");
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
            <span>تحويل مصرفي</span>
          </h1>
        </div>

        <div className="card" style={s.card}>
          <div style={s.amountBox}>
            <span>قيمة الدفع</span>
            <strong>{state.amount} دينار</strong>
          </div>

          <p style={s.note}>
            بعد تسجيل الطلب سنتواصل معك على رقم الواتساب لإرسال بيانات التحويل وتأكيد التبرع.
          </p>

          {message && <div className="alert alert-success">{message}</div>}

          <button className="btn-primary" onClick={saveRequest} disabled={isLoading}>
            {isLoading ? <><span className="spinner" /> جاري التسجيل...</> : "تسجيل طلب التحويل"}
          </button>

          <button type="button" onClick={() => navigate("/payment", { state })} style={s.backBtn}>
            العودة لاختيار طريقة الدفع
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 520, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "2rem" },
  card: { padding: "2.2rem" },
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
    marginBottom: "1.3rem",
  },
  note: {
    color: "var(--text-muted)",
    lineHeight: 1.9,
    marginBottom: "1rem",
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
