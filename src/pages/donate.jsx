import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const PRICE_PER_BOX = 6;

function convertToEnglishDigits(input) {
  return input.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

export default function Donate() {
  const [phone, setPhone]       = useState("+218");
  const [mosque, setMosque]     = useState("");
  const [mosqueAddress, setMosqueAddress] = useState("");
  const [mosqueLocation, setMosqueLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState("");
  const navigate = useNavigate();

  const total = PRICE_PER_BOX * quantity;

  const changeQty = (delta) => {
    setQuantity((q) => Math.max(1, Math.min(100, q + delta)));
  };

  const getMapsSearchUrl = () => {
    const query = [mosque.trim(), mosqueAddress.trim(), "بنغازي", "ليبيا"]
      .filter(Boolean)
      .join(" ");

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "مساجد بنغازي ليبيا")}`;
  };

  const openGoogleMaps = () => {
    window.open(getMapsSearchUrl(), "_blank", "noopener,noreferrer");
  };

  const useCurrentLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع. يمكنك فتح خرائط Google وإرسال العنوان يدويًا.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        setMosqueLocation(`https://www.google.com/maps?q=${latitude},${longitude}`);
        setIsLocating(false);
      },
      () => {
        setError("تعذر تحديد الموقع. تأكد من السماح للموقع باستخدام موقعك.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
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

      const mosqueName = mosque.trim();
      const address = mosqueAddress.trim();
      const location = mosqueLocation.trim();

      if (!mosqueName) {
        setError("يرجى كتابة اسم المسجد");
        setIsLoading(false);
        return;
      }

      if (!address) {
        setError("يرجى كتابة عنوان المسجد");
        setIsLoading(false);
        return;
      }

      if (!location) {
        setError("يرجى الضغط على زر استخدام موقعي الحالي لإضافة موقع المسجد");
        setIsLoading(false);
        return;
      }

      if (!/^https?:\/\/.+/i.test(location)) {
        setError("رابط الموقع يجب أن يبدأ بـ http أو https");
        setIsLoading(false);
        return;
      }

      const response = await axios.post(
        "https://api.saniah.ly/api/pay",
        { customer: cleanedPhone, amount: total, mosque: mosqueName, quantity },
        { headers: { "X-Request-ID": uuidv4() }, timeout: 20000 }
      );

      if (response.data.success) {
        navigate("/confirm", {
          state: {
            sessionID: response.data.sessionID,
            phone: cleanedPhone,
            amount: total,
            quantity,
            mosque: mosqueName,
            mosqueAddress: address,
            mosqueLocation: location,
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
            <label>اسم المسجد</label>
            <input
              type="text"
              value={mosque}
              onChange={(e) => setMosque(e.target.value)}
              placeholder="اكتب اسم المسجد"
            />
          </div>

          <div className="form-group">
            <label>عنوان المسجد</label>
            <input
              type="text"
              value={mosqueAddress}
              onChange={(e) => setMosqueAddress(e.target.value)}
              placeholder="مثال: بنغازي، منطقة ..."
            />
          </div>

          <div className="form-group">
            <label>موقع المسجد على خرائط Google</label>
            <div style={s.locationActions}>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={isLocating}
                style={s.locationButton}
              >
                {isLocating ? "جاري تحديد الموقع..." : "استخدم موقعي الحالي"}
              </button>
              <button
                type="button"
                onClick={openGoogleMaps}
                style={s.mapButton}
              >
                افتح خرائط Google
              </button>
            </div>
            {mosqueLocation && (
              <a
                href={mosqueLocation}
                target="_blank"
                rel="noreferrer"
                style={s.locationLink}
              >
                تم تحديد الموقع - عرض على الخريطة
              </a>
            )}
            <p style={s.fieldHint}>
              عند الضغط على استخدام موقعي الحالي سيطلب المتصفح السماح بتحديد الموقع.
            </p>
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
  fieldHint: {
    color: "var(--text-muted)",
    fontSize: "0.78rem",
    lineHeight: 1.7,
    marginTop: "0.45rem",
  },
  locationActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
  },
  locationButton: {
    minHeight: 46,
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, var(--blue-bright), var(--cyan))",
    color: "#fff",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0.75rem",
  },
  mapButton: {
    minHeight: 46,
    border: "1px solid rgba(0,212,255,0.3)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    color: "var(--cyan)",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0.75rem",
  },
  locationLink: {
    display: "block",
    color: "var(--success)",
    fontSize: "0.84rem",
    fontWeight: 700,
    marginTop: "0.65rem",
    textDecoration: "none",
  },

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
