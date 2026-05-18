import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";
import OtpInput from "react-otp-input";

export default function OtpConfirmationPage() {
  const [otp, setOtp]                   = useState("");
  const [status, setStatus]             = useState(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown]       = useState(60);

  const navigate      = useNavigate();
  const { state }     = useLocation();

  useEffect(() => {
    if (!state?.sessionID) navigate("/donate");
  }, [navigate, state]);

  useEffect(() => {
    let timer;
    if (resendDisabled) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); setResendDisabled(false); return 60; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendDisabled]);

  const saveDonation = async () => {
    await addDoc(collection(db, "donations"), {
      phone: state.phone,
      amount: state.quantity,
      mosque: state.mosque,
      sessionID: state.sessionID,
      country: "ليبيا",
      timestamp: new Date(),
      status: "مكتمل",
      otpVerified: true,
    });
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setStatus({ type: "info", msg: "جاري إعادة إرسال الكود..." });
    try {
      await axios.post("https://api.saniah.ly/resend-otp", {
        phone: state.phone, sessionID: state.sessionID, countryCode: "LY",
      });
      setStatus({ type: "success", msg: "✔ تم إرسال كود جديد" });
    } catch {
      setStatus({ type: "error", msg: "❌ فشل في إعادة الإرسال" });
    }
  };

  const handleConfirm = async () => {
    if (isLoading) return;
    if (otp.length !== 4) {
      setStatus({ type: "warning", msg: "❗ الرجاء إدخال كود مكون من 4 أرقام" });
      return;
    }
    setIsLoading(true);
    setStatus(null);
    try {
      const verifyRes = await axios.get(`https://api.saniah.ly/verify/${state.sessionID}`);
      if (!verifyRes.data.isValid) {
        setStatus({ type: "error", msg: "❌ انتهت صلاحية الجلسة، يرجى البدء من جديد" });
        return;
      }
      const confirmRes = await axios.post("https://api.saniah.ly/confirm", {
        otp, sessionID: state.sessionID, phone: state.phone, countryCode: "LY",
      });
      if (confirmRes.data.success) {
        await saveDonation();
        setStatus({ type: "success", msg: "✅ تمت العملية بنجاح" });
        setTimeout(() => navigate("/thank-you"), 1500);
      } else {
        setStatus({ type: "error", msg: confirmRes.data.message || "❌ كود التأكيد غير صحيح" });
      }
    } catch {
      setStatus({ type: "error", msg: "❌ حدث خطأ أثناء التأكيد" });
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
          <h1 className="section-title">أدخل كود <span>التحقق</span></h1>
        </div>

        <div className="card" style={s.card}>

          {/* Info */}
          <div style={s.infoBox}>
            <p style={s.infoText}>تم إرسال كود التحقق إلى الرقم:</p>
            <p style={s.phoneDisplay}>{state?.phone}</p>
          </div>

          {/* OTP Input */}
          <div style={{ display: "flex", justifyContent: "center", margin: "1.8rem 0" }}>
            <OtpInput
              value={otp}
              onChange={setOtp}
              numInputs={4}
              renderInput={(props) => (
                <input {...props} className="otp-single-input" dir="ltr" />
              )}
              containerStyle={{ gap: "0.8rem", direction: "ltr" }}
              shouldAutoFocus
            />
          </div>

          {/* Alert */}
          {status && (
            <div className={`alert ${
              status.type === "error"   ? "alert-danger"  :
              status.type === "warning" ? "alert-warning" : "alert-success"
            }`}>
              {status.msg}
            </div>
          )}

          {/* Confirm */}
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={isLoading}
            style={{ marginTop: "1.2rem" }}
          >
            {isLoading ? <><span className="spinner" /> جاري التأكيد...</> : "✅ تأكيد الدفع"}
          </button>

          {/* Resend */}
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

          {/* Back */}
          <button
            onClick={() => navigate("/donate")}
            style={s.backBtn}
          >
            ← العودة للتبرع
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 480, margin: "0 auto" },
  header:  { textAlign: "center", marginBottom: "2rem" },
  lockIcon: { fontSize: "3rem", marginBottom: "0.8rem" },
  card: { padding: "2.2rem" },

  infoBox: {
    textAlign: "center",
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14, padding: "1.2rem",
    marginBottom: "0.5rem",
  },
  infoText: { color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "0.4rem" },
  phoneDisplay: {
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1.4rem", fontWeight: 800, color: "var(--cyan)",
    direction: "ltr",
  },

  resendBtn: {
    display: "block", width: "100%",
    background: "transparent", border: "none",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.92rem", fontWeight: 600,
    marginTop: "1rem", padding: "0.5rem",
    textAlign: "center",
    transition: "color 0.3s",
  },
  backBtn: {
    display: "block", width: "100%",
    background: "transparent", border: "none",
    color: "var(--text-muted)",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.88rem", cursor: "pointer",
    marginTop: "0.5rem", padding: "0.4rem",
    textAlign: "center",
  },
};
