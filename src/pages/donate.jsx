import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const PRICE_PER_BOX = 6;

const MOSQUES = [
  "مسجد الرحمن",
  "مسجد النور",
  "مسجد الهدى",
  "مسجد التوحيد",
  "مسجد السلام",
  "مسجد الفاروق",
];

function convertToEnglishDigits(input) {
  return input.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

export default function Donate() {
  const [phone, setPhone]       = useState("+218");
  const [mosque, setMosque]     = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState("");
  const navigate = useNavigate();

  const total = PRICE_PER_BOX * quantity;

  const changeQty = (delta) => {
    setQuantity((q) => Math.max(1, Math.min(100, q + delta)));
  };

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);

    try {
      const cleanedPhone = convertToEnglishDigits(phone).replace(/\s+/g, "").trim();

      if (!/^\+2189\d{8}$/.test(cleanedPhone)) {
        setError("رقم الهاتف يجب أن يكون +218 متبوعًا بـ 9 أرقام تبدأ بـ 9");
        setIsLoading(false);
        return;
      }

      if (!mosque) {
        setError("يرجى اختيار المسجد");
        setIsLoading(false);
        return;
      }

      const response = await axios.post(
        "https://api.saniah.ly/api/pay",
        { customer: cleanedPhone, amount: total, mosque, quantity },
        { headers: { "X-Request-ID": uuidv4() }, timeout: 20000 }
      );

      if (response.data.success) {
        navigate("/confirm", {
          state: {
            sessionID: response.data.sessionID,
            phone: cleanedPhone,
            amount: total,
            quantity,
            mosque,
          },
        });
      } else {
        setError(response.data.error || "حدث خطأ أثناء المعالجة");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        "تعذر الاتصال بالخادم. يرجى المحاولة لاحقًا"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>

        {/* Header */}
        <div style={s.header}>
          <span className="section-tag">تبرع الآن</span>
          <h1 className="section-title">
            تبرع بـ <span>كرتونة ماء</span>
          </h1>
          <p style={s.subtitle}>
            ادفع قيمة الكرتونة وسنوصلها للمساجد في بنغازي
          </p>
        </div>

        {/* Card */}
        <div className="card" style={s.card}>

          {/* Price badge */}
          <div style={s.priceBadge}>
            <div style={s.priceLabel}>سعر الكرتونة الواحدة</div>
            <div style={s.priceValue}>
              <span style={s.priceCurrency}>دينار </span>
              {PRICE_PER_BOX}
            </div>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>رقم الهاتف (مصرف التجارة)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+218912345678"
              dir="ltr"
            />
          </div>

          {/* Mosque */}
          <div className="form-group">
            <label>المسجد المراد التوصيل إليه</label>
            <select value={mosque} onChange={(e) => setMosque(e.target.value)}>
              <option value="">اختر مسجداً</option>
              {MOSQUES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="form-group">
            <label>عدد الكراتين</label>
            <div className="qty-control">
              <button className="qty-btn" onClick={() => changeQty(-1)}>−</button>
              <div className="qty-display">{quantity}</div>
              <button className="qty-btn" onClick={() => changeQty(1)}>+</button>
            </div>
          </div>

          {/* Total */}
          <div className="total-box">
            المبلغ الإجمالي:{" "}
            <strong>{total} دينار</strong>
          </div>

          {/* Error */}
          {error && <div className="alert alert-danger">{error}</div>}

          {/* Submit */}
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ marginTop: "0.5rem" }}
          >
            {isLoading ? (
              <><span className="spinner" /> جاري المعالجة...</>
            ) : (
              "💧 أرسل طلب التبرع"
            )}
          </button>

          <p style={s.note}>
            ستصلك رسالة OTP على هاتفك لتأكيد الدفع
          </p>
        </div>

        {/* Trust indicators */}
        <div style={s.trust}>
          {["🔒 دفع آمن", "🕌 توصيل مضمون", "📸 توثيق كامل"].map((t) => (
            <span key={t} style={s.trustItem}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 560, margin: "0 auto" },
  header:  { textAlign: "center", marginBottom: "2.5rem" },
  subtitle: { color: "var(--text-muted)", fontSize: "0.97rem", marginTop: "0.5rem" },
  card: { padding: "2.2rem" },

  priceBadge: {
    textAlign: "center",
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    padding: "1.2rem",
    marginBottom: "2rem",
  },
  priceLabel: { fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.3rem" },
  priceValue: {
    fontFamily: "'Cairo', sans-serif",
    fontSize: "2.8rem", fontWeight: 900, color: "var(--cyan)",
  },
  priceCurrency: { fontSize: "1.1rem", color: "var(--text-muted)" },

  note: {
    textAlign: "center", fontSize: "0.82rem",
    color: "var(--text-muted)", marginTop: "1rem",
  },

  trust: {
    display: "flex", justifyContent: "center",
    gap: "1.5rem", flexWrap: "wrap", marginTop: "1.8rem",
  },
  trustItem: {
    fontSize: "0.82rem", color: "var(--text-muted)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(0,212,255,0.1)",
    padding: "0.4rem 1rem", borderRadius: "50px",
  },
};
