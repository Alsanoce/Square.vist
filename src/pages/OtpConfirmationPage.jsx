import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OtpInput from "react-otp-input";
import { callEdfaaly } from "../lib/edfaalyApi";

export default function OtpConfirmationPage() {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const navigate = useNavigate();
  const { state } = useLocation();
  const payableAmount = Number(state?.amount || 0);

  useEffect(() => {
    if (!state?.sessionID) navigate("/donate");
  }, [navigate, state]);

  useEffect(() => {
    let timer;

    if (resendDisabled) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setResendDisabled(false);
            return 60;
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [resendDisabled]);

  const isBankConfirmationOk = (response) => {
    const rawResponse = String(response?.rawResponse || "");
    const resultCode = String(response?.resultCode || response?.code || "");

    return (
      response?.success ||
      /<OnlineConfTransResult[^>]*>\s*OK\s*<\/OnlineConfTransResult>/i.test(rawResponse) ||
      /^OK$/i.test(resultCode.trim())
    );
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setStatus({
      type: "warning",
      msg: "لإعادة إرسال الكود يرجى الرجوع وإعادة بدء عملية الدفع",
    });
  };

  const handleConfirm = async () => {
    if (isLoading) return;

    if (otp.length !== 4) {
      setStatus({ type: "warning", msg: "الرجاء إدخال كود مكون من 4 أرقام" });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const confirmRes = await callEdfaaly("onlineConfTrans", {
        otp,
        sessionID: state.sessionID,
        customerMobile: state.paymentPhone || state.phone,
        paymentMethod: state.paymentMethod || "أدفع لي",
        amount: payableAmount,
        decimalAmount: payableAmount,
        originalAmount: payableAmount,
        totalAmount: payableAmount,
        meterNumber: state.mosque,
      });

      if (isBankConfirmationOk(confirmRes)) {
        setStatus({ type: "success", msg: "تمت العملية بنجاح" });
        setTimeout(() => navigate("/thank-you"), 1500);
      } else {
        setStatus({
          type: "error",
          msg: confirmRes.message || "كود التأكيد غير صحيح أو العملية مرفوضة",
        });
      }
    } catch (err) {
      setStatus({
        type: "error",
        msg: err.message || "حدث خطأ أثناء التأكيد",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div style={s.header}>
          <div style={s.lockIcon}>🔐</div>
          <span className="section-tag">تأكيد الدفع</span>
          <h1 className="section-title">
            أدخل كود <span>التحقق</span>
          </h1>
        </div>

        <div className="card" style={s.card}>
          <div style={s.infoBox}>
            <p style={s.infoText}>تم إرسال كود التحقق إلى الرقم:</p>
            <p style={s.phoneDisplay}>{state?.paymentPhone || state?.phone}</p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", margin: "1.8rem 0" }}>
            <OtpInput
              value={otp}
              onChange={setOtp}
              numInputs={4}
              renderInput={(props) => <input {...props} className="otp-single-input" dir="ltr" />}
              containerStyle={{ gap: "0.8rem", direction: "ltr" }}
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

          <button
            onClick={handleResend}
            disabled={resendDisabled || isLoading}
            style={{
              ...s.resendBtn,
              color: resendDisabled ? "var(--text-muted)" : "var(--cyan)",
              cursor: resendDisabled ? "not-allowed" : "pointer",
            }}
          >
            {resendDisabled ? `إعادة إرسال (${countdown}s)` : "إعادة إرسال الكود"}
          </button>

          <button onClick={() => navigate("/donate")} style={s.backBtn}>
            ← العودة للتبرع
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
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.92rem",
    fontWeight: 600,
    marginTop: "1rem",
    padding: "0.5rem",
    textAlign: "center",
    transition: "color 0.3s",
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
