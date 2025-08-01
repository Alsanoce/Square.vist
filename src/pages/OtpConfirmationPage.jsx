import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";
import OtpInput from "react-otp-input";

function OtpConfirmationPage() {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  const navigate = useNavigate();
  const { state } = useLocation();

  useEffect(() => {
    if (!state?.sessionID) {
      navigate("/donate");
    }
  }, [navigate, state]);

  useEffect(() => {
    if (resendDisabled) {
      const timer = setInterval(() => {
        setCountdown(prev => prev <= 1 ? (clearInterval(timer), 60 : prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendDisabled]);

  const saveDonation = async () => {
    try {
      await addDoc(collection(db, "donations"), {
        phone: state.phone,
        amount: state.quantity,
        mosque: state.mosque,
        sessionID: state.sessionID,
        country: "ليبيا",
        timestamp: new Date(),
        status: "بانتظار التأكيد"
      });
    } catch (error) {
      console.error("خطأ في حفظ البيانات:", error);
      throw error;
    }
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setStatus("جاري إعادة إرسال الكود...");
    
    try {
      await axios.post("https://api.saniah.ly/resend-otp", {
        phone: state.phone,
        countryCode: "LY"
      });
      setStatus("✔ تم إرسال كود جديد");
    } catch (error) {
      setStatus("❌ فشل في إعادة الإرسال");
    }
  };

  const handleConfirm = async () => {
    if (isLoading) return;
    if (otp.length !== 4) {
      setStatus("❗ الرجاء إدخال كود مكون من 4 أرقام");
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const res = await axios.post("https://api.saniah.ly/confirm", {
        otp,
        phone: state.phone,
        sessionID: state.sessionID,
        countryCode: "LY"
      });

      if (res.data.success) {
        await saveDonation();
        setStatus("✅ تمت العملية بنجاح");
        setTimeout(() => navigate("/thank-you"), 1500);
      } else {
        setStatus(res.data.message || "❌ كود التأكيد غير صحيح");
      }
    } catch (err) {
      console.error("خطأ في التأكيد:", err);
      setStatus("❌ فشل في الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-center mb-6">تأكيد الدفع</h2>
      
      <div className="text-center mb-4">
        <p>تم إرسال كود التحقق إلى:</p>
        <p className="font-bold">+{state?.phone}</p>
      </div>

      <div className="flex justify-center mb-6">
        <OtpInput
          value={otp}
          onChange={setOtp}
          numInputs={4}
          renderInput={(props) => (
            <input {...props} className="otp-input" dir="ltr" />
          )}
          containerStyle="gap-2"
          inputStyle={{
            width: '3rem',
            height: '3.5rem',
            fontSize: '1.5rem',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}
          shouldAutoFocus
        />
      </div>

      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className={`w-full p-3 mb-3 rounded text-white ${
          isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {isLoading ? "جاري التأكيد..." : "تأكيد الدفع"}
      </button>

      <button
        onClick={handleResend}
        disabled={resendDisabled || isLoading}
        className={`w-full p-2 ${
          resendDisabled ? "text-gray-400" : "text-blue-600 hover:text-blue-800"
        }`}
      >
        {resendDisabled ? `إعادة إرسال (${countdown})` : "إعادة إرسال الكود"}
      </button>

      {status && (
        <div className={`mt-4 p-3 text-center rounded ${
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

export default OtpConfirmationPage;
