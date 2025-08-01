import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";
import OtpInput from "react-otp-input";

export default function OtpConfirmationPage() {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  const navigate = useNavigate();
  const { state } = useLocation();

  // تحميل بيانات التبرع أو إعادة التوجيه
  useEffect(() => {
    if (!state?.sessionID) {
      navigate("/donate");
    }
  }, [navigate, state]);

  // العد التنازلي لإعادة الإرسال
  useEffect(() => {
    if (resendDisabled) {
      const timer = setInterval(() => {
        setCountdown(prev => prev <= 1 ? (clearInterval(timer), 60 : prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendDisabled]);

  // حفظ بيانات التبرع في Firebase
  const saveDonation = async () => {
    try {
      await addDoc(collection(db, "donations"), {
        phone: state.phone,
        amount: state.quantity,
        mosque: state.mosque,
        sessionID: state.sessionID,
        status: "مكتمل",
        timestamp: new Date(),
        otpVerified: true
      });
    } catch (error) {
      console.error("خطأ في حفظ البيانات:", error);
      throw error;
    }
  };

  // إعادة إرسال كود OTP
  const handleResend = async () => {
    setResendDisabled(true);
    setStatus("جاري إعادة إرسال الكود...");
    
    try {
      await axios.post("https://api.saniah.ly/resend-otp", {
        phone: state.phone,
        sessionID: state.sessionID
      });
      setStatus("✔ تم إرسال كود جديد");
    } catch (error) {
      setStatus("❌ فشل في إعادة الإرسال");
    }
  };

  // تأكيد الدفع
  const handleConfirm = async () => {
    if (isLoading) return;
    if (otp.length !== 4) {
      setStatus("❗ الرجاء إدخال الكود المكون من 4 أرقام");
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      // التحقق من صحة الجلسة
      const verifyRes = await axios.get(
        `https://api.saniah.ly/verify/${state.sessionID}`
      );
      
      if (!verifyRes.data.isValid) {
        setStatus("❌ انتهت صلاحية الجلسة، يرجى البدء من جديد");
        return;
      }

      // تأكيد الدفع
      const confirmRes = await axios.post("https://api.saniah.ly/confirm", {
        otp,
        sessionID: state.sessionID
      });

      if (confirmRes.data.success) {
        await saveDonation();
        setStatus("✅ تمت العملية بنجاح");
        setTimeout(() => navigate("/thank-you"), 1500);
      } else {
        setStatus(confirmRes.data.message || "❌ كود التأكيد غير صحيح");
      }
    } catch (error) {
      console.error("خطأ في التأكيد:", error);
      setStatus("❌ حدث خطأ أثناء التأكيد");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">تأكيد الدفع</h1>
      
      <div className="text-center mb-6">
        <p>تم إرسال كود التحقق إلى الرقم:</p>
        <p className="font-bold">+{state?.phone}</p>
      </div>

      {/* إدخال OTP */}
      <div className="flex justify-center mb-6">
        <OtpInput
          value={otp}
          onChange={setOtp}
          numInputs={4}
          renderInput={(props) => (
            <input
              {...props}
              className="otp-input"
              dir="ltr"
            />
          )}
          containerStyle="gap-2"
          inputStyle={{
            width: '3rem',
            height: '3.5rem',
            fontSize: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #ddd',
            textAlign: 'center'
          }}
          shouldAutoFocus
        />
      </div>

      {/* زر التأكيد */}
      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className={`w-full py-3 rounded text-white mb-3 ${
          isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {isLoading ? "جاري التأكيد..." : "تأكيد الدفع"}
      </button>

      {/* إعادة إرسال الكود */}
      <button
        onClick={handleResend}
        disabled={resendDisabled || isLoading}
        className={`w-full py-2 ${
          resendDisabled ? "text-gray-400" : "text-blue-600 hover:text-blue-800"
        }`}
      >
        {resendDisabled ? `إعادة إرسال (${countdown})` : "إعادة إرسال الكود"}
      </button>

      {/* رسائل الحالة */}
      {status && (
        <div className={`mt-4 p-3 text-center rounded-lg ${
          status.includes("❌") ? "bg-red-100 text-red-700" : 
          status.includes("❗") ? "bg-yellow-100 text-yellow-700" : 
          "bg-green-100 text-green-700"
        }`}>
          {status}
        </div>
      )}
    </div>
  );
}
