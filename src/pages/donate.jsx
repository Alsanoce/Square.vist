import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DONATION_PACKAGES, createTransactionId, getDonationPackage } from "../lib/donationPricing";

function convertToEnglishDigits(input) {
  return input.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

export default function Donate() {
  const [donorName, setDonorName] = useState("");
  const [phone, setPhone] = useState("");
  const [mosque, setMosque] = useState("");
  const [mosqueAddress, setMosqueAddress] = useState("");
  const [mosqueLocation, setMosqueLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [quantity, setQuantity] = useState(DONATION_PACKAGES[0].quantity);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const selectedPackage = getDonationPackage(quantity);
  const total = selectedPackage.total;
  const unitPrice = total / selectedPackage.quantity;
  const canSelectMosque = selectedPackage.quantity >= 10;
  const distributionType = canSelectMosque ? "selected_mosque" : "nearest_mosque";

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

  const handleSubmit = () => {
    setError("");

    const name = donorName.trim();
    const cleanedPhone = convertToEnglishDigits(phone).replace(/\D/g, "").trim();
    const mosqueName = mosque.trim();
    const address = mosqueAddress.trim();
    const location = mosqueLocation.trim();

    if (!name) {
      setError("يرجى كتابة اسم المتبرع");
      return;
    }

    if (!/^9\d{8}$/.test(cleanedPhone)) {
      setError("رقم الواتساب يجب أن يكون 9 أرقام ويبدأ بـ 9، بدون +218");
      return;
    }

    if (canSelectMosque && !mosqueName) {
      setError("يرجى كتابة اسم المسجد");
      return;
    }

    if (canSelectMosque && !address) {
      setError("يرجى كتابة عنوان المسجد");
      return;
    }

    if (canSelectMosque && !location) {
      setError("يرجى الضغط على زر استخدام موقعي الحالي لإضافة موقع المسجد");
      return;
    }

    const paymentMosque = canSelectMosque ? mosqueName : "أقرب مسجد";
    const paymentMosqueAddress = canSelectMosque ? address : "يتم التوزيع على أقرب مسجد داخل بنغازي";
    const paymentMosqueLocation = canSelectMosque ? location : "";

    navigate("/payment", {
      state: {
        transactionId: createTransactionId(),
        donorName: name,
        phone: `+218${cleanedPhone}`,
        whatsapp: cleanedPhone,
        amount: total,
        quantity: selectedPackage.quantity,
        unitPrice,
        mosque: paymentMosque,
        mosqueAddress: paymentMosqueAddress,
        mosqueLocation: paymentMosqueLocation,
        distributionType,
      },
    });
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div style={s.header}>
          <span className="section-tag">تبرع الآن</span>
          <h1 className="section-title">
            تبرع بـ <span>كراتين ماء</span>
          </h1>
          <p style={s.subtitle}>اختر عدد الكراتين وسنقوم بتوصيلها للمسجد المحدد في بنغازي.</p>
        </div>

        <div className="card" style={s.card}>
          <div style={s.priceBadge}>
            <div style={s.priceLabel}>أقل تبرع</div>
            <div style={s.priceValue}>
              <span style={s.priceCurrency}>دينار </span>
              {DONATION_PACKAGES[0].total}
            </div>
            <p style={s.packageHint}>اختر عدد الكراتين، وكلما زاد العدد صار سعر الكرتونة أقل.</p>
          </div>

          <div className="form-group">
            <label>اسم المتبرع</label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="اكتب اسمك"
            />
          </div>

          <div className="form-group">
            <label>رقم الواتساب</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(convertToEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 9))}
              placeholder="912345678"
              dir="ltr"
            />
            <p style={s.fieldHint}>اكتب الرقم بدون +218.</p>
          </div>

          <div className="form-group">
            <label>عدد كراتين الماء</label>
            <div style={s.packageGrid}>
              {DONATION_PACKAGES.map((item) => {
                const isSelected = item.quantity === selectedPackage.quantity;

                return (
                  <button
                    key={item.quantity}
                    type="button"
                    onClick={() => setQuantity(item.quantity)}
                    style={{
                      ...s.packageButton,
                      ...(isSelected ? s.packageButtonActive : {}),
                    }}
                  >
                    <strong>{item.quantity}</strong>
                    <span>كرتونة</span>
                    <small>{item.total} دينار</small>
                  </button>
                );
              })}
            </div>
            <div style={s.distributionNote}>
              {canSelectMosque
                ? "للتبرعات من 10 كراتين أو أكثر، يمكنك تحديد مسجد داخل نطاق مدينة بنغازي."
                : "للتبرعات أقل من 10 كراتين، سيتم توزيع المياه على أقرب مسجد داخل مدينة بنغازي."
              }
            </div>
          </div>

          {canSelectMosque && (
            <>
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
                  <button type="button" onClick={useCurrentLocation} disabled={isLocating} style={s.locationButton}>
                    {isLocating ? "جاري تحديد الموقع..." : "استخدم موقعي الحالي"}
                  </button>
                  <button type="button" onClick={openGoogleMaps} style={s.mapButton}>
                    افتح خرائط Google
                  </button>
                </div>
                {mosqueLocation && (
                  <a href={mosqueLocation} target="_blank" rel="noreferrer" style={s.locationLink}>
                    تم تحديد الموقع - عرض على الخريطة
                  </a>
                )}
                <p style={s.fieldHint}>عند الضغط على استخدام موقعي الحالي سيطلب المتصفح السماح بتحديد الموقع.</p>
              </div>
            </>
          )}
          <div className="total-box">
            <span>المبلغ الإجمالي: </span>
            <strong>{total} دينار</strong>
            <small style={s.totalHint}>سعر الكرتونة: {unitPrice.toFixed(2)} دينار</small>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button className="btn-primary" onClick={handleSubmit} style={{ marginTop: "0.5rem" }}>
            المتابعة إلى الدفع
          </button>

          <p style={s.note}>في الخطوة التالية اختر طريقة الدفع المناسبة لك.</p>
        </div>

        <div style={s.trust}>
          {["دفع آمن", "توصيل مضمون", "توثيق كامل"].map((t) => (
            <span key={t} style={s.trustItem}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 560, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "2.5rem" },
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
    fontSize: "2.8rem",
    fontWeight: 900,
    color: "var(--cyan)",
  },
  priceCurrency: { fontSize: "1.1rem", color: "var(--text-muted)" },
  packageHint: {
    color: "var(--text-muted)",
    fontSize: "0.84rem",
    marginTop: "0.45rem",
  },
  fieldHint: {
    color: "var(--text-muted)",
    fontSize: "0.78rem",
    lineHeight: 1.7,
    marginTop: "0.45rem",
  },
  distributionNote: {
    color: "var(--text-muted)",
    background: "rgba(0,212,255,0.08)",
    border: "1px solid rgba(0,212,255,0.16)",
    borderRadius: 12,
    fontSize: "0.84rem",
    lineHeight: 1.7,
    marginTop: "0.85rem",
    padding: "0.75rem 0.9rem",
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
  packageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "0.75rem",
  },
  packageButton: {
    minHeight: 104,
    display: "grid",
    alignContent: "center",
    gap: "0.2rem",
    border: "1px solid rgba(0,212,255,0.18)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    color: "var(--white)",
    fontFamily: "'Tajawal', sans-serif",
    cursor: "pointer",
    padding: "0.8rem 0.5rem",
  },
  packageButtonActive: {
    borderColor: "rgba(0,212,255,0.75)",
    background: "rgba(0,212,255,0.12)",
    boxShadow: "0 0 0 2px rgba(0,212,255,0.1)",
  },
  totalHint: {
    display: "block",
    color: "var(--text-muted)",
    fontSize: "0.78rem",
    marginTop: "0.35rem",
  },
  note: {
    textAlign: "center",
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    marginTop: "1rem",
  },
  trust: {
    display: "flex",
    justifyContent: "center",
    gap: "1.5rem",
    flexWrap: "wrap",
    marginTop: "1.8rem",
  },
  trustItem: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(0,212,255,0.1)",
    padding: "0.4rem 1rem",
    borderRadius: "50px",
  },
};
