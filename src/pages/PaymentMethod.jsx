import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { callEdfaaly } from "../lib/edfaalyApi";

const PRICE_PER_BOX = 6;

const METHOD_CONFIG = {
  edfaaly: {
    title: "أدفع لي",
    icon: "/payment-icons/adfa3ly.png",
    fieldLabel: "رقم هاتف أدفع لي",
    placeholder: "912345678",
    help: "اكتب رقم هاتف أدفع لي بدون +218.",
    paymentMethod: "أدفع لي",
    validate: (value) => /^9\d{8}$/.test(value),
    error: "رقم هاتف أدفع لي يجب أن يكون 9 أرقام ويبدأ بـ 9، بدون +218",
    toCustomer: (value) => `+218${value}`,
  },
  mobicash: {
    title: "موبي كاش",
    icon: "/payment-icons/mobicash.png",
    fieldLabel: "رقم بطاقة موبي كاش",
    placeholder: "اكتب رقم البطاقة",
    help: "اكتب رقم البطاقة كما هو ظاهر لديك.",
    paymentMethod: "موبي كاش",
    validate: (value) => value.length >= 8,
    error: "رقم بطاقة موبي كاش يجب أن يكون 8 أرقام على الأقل",
    toCustomer: (value) => value,
    manual: true,
  },
};

function normalizeDigits(value, maxLength = 24) {
  return value
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

export default function PaymentMethod() {
  const { method } = useParams();
  const config = METHOD_CONFIG[method];
  const { state } = useLocation();
  const navigate = useNavigate();
  const [paymentNumber, setPaymentNumber] = useState(method === "edfaaly" ? state?.whatsapp || "" : "");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const payableAmount = Number(state?.quantity || 1) * PRICE_PER_BOX;

  useEffect(() => {
    if (!config || !state?.phone || !state?.mosque) navigate("/donate");
  }, [config, navigate, state]);

  const startPayment = async () => {
    const normalized = normalizeDigits(paymentNumber);

    if (!config.validate(normalized)) {
      throw new Error(config.error);
    }

    const customer = config.toCustomer(normalized);

    if (config.manual) {
      await addDoc(collection(db, "payment_requests"), {
        donorName: state.donorName,
        phone: state.phone,
        whatsapp: state.whatsapp,
        amount: state.amount,
        quantity: state.quantity,
        mosque: state.mosque,
        mosqueAddress: state.mosqueAddress,
        mosqueLocation: state.mosqueLocation,
        paymentMethod: config.paymentMethod,
        paymentNumber: normalized,
        status: "بانتظار الدفع",
        country: "ليبيا",
        timestamp: new Date(),
      });

      setMessage({
        type: "success",
        text: "تم تسجيل طلب موبي كاش. سنتواصل معك على واتساب لإتمام الدفع.",
      });
      return;
    }

    const response = await callEdfaaly("doPTrans", {
      customerMobile: customer,
      amount: payableAmount,
      decimalAmount: payableAmount,
      originalAmount: payableAmount,
      totalAmount: payableAmount,
      unitPrice: PRICE_PER_BOX,
      quantity: state.quantity,
      paymentMethod: config.paymentMethod,
      meterNumber: state.mosque,
      cardNumber: method === "mobicash" ? normalized : "",
      mobiCard: method === "mobicash" ? normalized : "",
    });

    if (!response.success) {
      throw new Error(response.message || "تعذر بدء الدفع");
    }

    navigate("/confirm", {
      state: {
        ...state,
        amount: payableAmount,
        paymentPhone: customer,
        paymentNumber: normalized,
        sessionID: response.sessionID,
        paymentMethod: config.paymentMethod,
      },
    });
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setMessage(null);

    try {
      await startPayment();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || err.message || "تعذر إكمال العملية. حاول مرة أخرى.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!config || !state) return null;

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div style={s.header}>
          <img src={config.icon} alt="" style={s.logo} />
          <span className="section-tag">الدفع</span>
          <h1 className="section-title">
            الدفع عبر <span>{config.title}</span>
          </h1>
        </div>

        <div className="card" style={s.card}>
          <div style={s.amountBox}>
            <span>قيمة الدفع</span>
            <strong>{payableAmount} دينار</strong>
          </div>

          <div className="form-group">
            <label>{config.fieldLabel}</label>
            <input
              type="tel"
              value={paymentNumber}
              onChange={(e) => setPaymentNumber(normalizeDigits(e.target.value))}
              placeholder={config.placeholder}
              dir="ltr"
            />
            <p style={s.fieldHint}>{config.help}</p>
          </div>

          {message && (
            <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}>
              {message.text}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ marginTop: "1rem" }}
          >
            {isLoading ? (
              <><span className="spinner" /> جاري المعالجة...</>
            ) : config.manual ? (
              "تسجيل طلب الدفع"
            ) : (
              "المتابعة إلى OTP"
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

const s = {
  wrapper: { maxWidth: 520, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "2rem" },
  card: { padding: "2.2rem" },
  logo: {
    width: 78,
    height: 78,
    objectFit: "contain",
    background: "rgba(255,255,255,0.94)",
    borderRadius: 14,
    padding: "0.5rem",
    marginBottom: "1rem",
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
    marginBottom: "1.3rem",
  },
  fieldHint: {
    color: "var(--text-muted)",
    fontSize: "0.78rem",
    lineHeight: 1.7,
    marginTop: "0.45rem",
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
