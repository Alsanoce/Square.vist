import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OtpInput from "react-otp-input";
import { callEdfaaly } from "../lib/edfaalyApi";
import { callYussor } from "../lib/yussorApi";

function normalizeDigits(value, maxLength) {
  return String(value || "")
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

function getOtpLength(isYussorPay) {
  if (!isYussorPay) return 4;

  const configured = Number(import.meta.env.VITE_YUSSOR_OTP_LENGTH || 6);
  if (!Number.isInteger(configured)) return 4;
  return Math.min(8, Math.max(4, configured));
}

function maskCardNumber(value) {
  const cardNumber = String(value || "");
  if (cardNumber.length <= 4) return cardNumber;
  return `${"•".repeat(Math.min(cardNumber.length - 4, 6))}${cardNumber.slice(-4)}`;
}

export default function OtpConfirmationPage() {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { state } = useLocation();
  const payableAmount = Number(state?.amount || 0);
  const isYussorPay = state?.paymentProvider === "yussor";
  const otpLength = getOtpLength(isYussorPay);
  const paymentTarget = useMemo(
    () =>
      isYussorPay
        ? maskCardNumber(state?.paymentNumber)
        : state?.paymentPhone || state?.phone,
    [isYussorPay, state]
  );

  useEffect(() => {
    if (!state?.sessionID) navigate("/donate");
  }, [navigate, state]);

  const isBankConfirmationOk = (response) => {
    const rawResponse = String(response?.rawResponse || "");
    const resultCode = String(response?.resultCode || response?.code || "");

    return (
      response?.success ||
      /<OnlineConfTransResult[^>]*>\s*OK\s*<\/OnlineConfTransResult>/i.test(rawResponse) ||
      /^OK$/i.test(resultCode.trim())
    );
  };

  const restartPayment = () => {
    const path = isYussorPay ? "/payment/yussor" : "/payment/edfaaly";
    navigate(path, { state });
  };

  const confirmYussorPay = () =>
    callYussor("completeSession", {
      otp,
      sessionID: state.sessionID,
      transactionId: state.transactionId || state.sessionID,
      paymentNumber: state.paymentNumber || "",
      paymentMethod: state.paymentMethod || "يسر باي",
      amount: payableAmount,
    });

  const confirmEdfaaly = () =>
    callEdfaaly("onlineConfTrans", {
      otp,
      sessionID: state.sessionID,
      customerMobile: state.paymentPhone || state.phone,
      paymentMethod: state.paymentMethod || "أدفع لي",
      amount: payableAmount,
      decimalAmount: payableAmount,
      originalAmount: payableAmount,
      totalAmount: payableAmount,
      unitPrice: state.unitPrice || "",
      quantity: state.quantity || "",
      transactionId: state.transactionId || "",
      donorName: state.donorName || "",
      donorPhone: state.phone || "",
      mosque: state.mosque || "",
      mosqueAddress: state.mosqueAddress || "",
      mosqueLocation: state.mosqueLocation || "",
      meterNumber: state.mosque,
    });

  const handleConfirm = async () => {
    if (isLoading) return;

    if (otp.length !== otpLength) {
      setStatus({ type: "warning", msg: `الرجاء إدخال كود مكون من ${otpLength} أرقام` });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const confirmRes = isYussorPay ? await confirmYussorPay() : await confirmEdfaaly();

      if (isBankConfirmationOk(confirmRes)) {
        setStatus({ type: "success", msg: "تمت العملية بنجاح" });
        setTimeout(() => navigate("/thank-you", { state: { ...state, amount: payableAmount } }), 1500);
      } else {
        setStatus({
          type: "error",
          msg: confirmRes.message || "كود التأكيد غير صحيح أو العملية مرفوضة",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        msg: error.message || "حدث خطأ أثناء التأكيد",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div style={s.header}>
          <div style={s.lockIcon} aria-hidden="true">🔐</div>
          <span className="section-tag">تأكيد الدفع</span>
          <h1 className="section-title">
            أدخل كود <span>التحقق</span>
          </h1>
        </div>

        <div className="card" style={s.card}>
          <div style={s.infoBox}>
            <p style={s.infoText}>
              تم إرسال كود من {otpLength} أرقام إلى {isYussorPay ? "البطاقة" : "الرقم"}:
            </p>
            <p style={s.phoneDisplay}>{paymentTarget}</p>
          </div>

          <div className="otp-inputs-wrapper">
            <OtpInput
              value={otp}
              onChange={(value) => setOtp(normalizeDigits(value, otpLength))}
              numInputs={otpLength}
              renderInput={(props) => (
                <input {...props} className="otp-single-input" inputMode="numeric" dir="ltr" />
              )}
              containerStyle="otp-inputs"
              shouldAutoFocus
            />
          </div>

          {status && (
            <div
              className={`alert ${
                status.type === "error"
                  ? "alert-danger"
                  : status.type === "warning"
                    ? "alert-warning"
                    : "alert-success"
              }`}
              role="status"
            >
              {status.msg}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={isLoading}
            style={{ marginTop: "1.2rem" }}
          >
            {isLoading ? (
              <>
                <span className="spinner" /> جاري التأكيد...
              </>
            ) : (
              "تأكيد الدفع"
            )}
          </button>

          <button type="button" onClick={restartPayment} disabled={isLoading} style={s.resendBtn}>
            الرجوع وإعادة إرسال الكود
          </button>

          <button type="button" onClick={() => navigate("/donate")} style={s.backBtn}>
            العودة للتبرع
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 480, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "2rem" },
  lockIcon: { fontSize: "3rem", marginBottom: "0.8rem" },
  card: { padding: "2.2rem" },
  infoBox: {
    textAlign: "center",
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    padding: "1.2rem",
    marginBottom: "0.5rem",
  },
  infoText: { color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "0.4rem" },
  phoneDisplay: {
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "var(--cyan)",
    direction: "ltr",
  },
  resendBtn: {
    display: "block",
    width: "100%",
    background: "transparent",
    border: "none",
    color: "var(--cyan)",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.92rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "1rem",
    padding: "0.5rem",
    textAlign: "center",
  },
  backBtn: {
    display: "block",
    width: "100%",
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.88rem",
    cursor: "pointer",
    marginTop: "0.5rem",
    padding: "0.4rem",
    textAlign: "center",
  },
};
