import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ← جديد
import axios from "axios";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

function OtpConfirmationPage() {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState(null);
  const [donationData, setDonationData] = useState(null);
  const navigate = useNavigate(); // ← جديد

  useEffect(() => {
    const data = localStorage.getItem("donation_data");
    if (data) {
      setDonationData(JSON.parse(data));
    }
  }, []);

  const saveDonation = async ({ phone, quantity, mosque, sessionID }) => {
    try {
      await addDoc(collection(db, "transactions"), {
        customer: phone,
        amount: quantity,
        mosqueName: mosque,
        sessionID,
        status: "confirmed",
        timestamp: new Date().toISOString(),
        deliveryStatus: "بانتظار التوصيل"
      });
      console.log("✅ تم تسجيل التبرع في Firestore");
    } catch (error) {
      console.error("❌ فشل في التسجيل:", error);
    }
  };

  const handleConfirm = async () => {
    if (!otp || !donationData?.sessionID) {
      setStatus("❌ البيانات غير مكتملة أو الكود غير مدخل");
      return;
    }

    try {
      const res = await axios.post("https://saniah-api.onrender.com/confirm", {
        otp,
        phone: donationData.phone,
        quantity: donationData.quantity,
        mosque: donationData.mosque,
        sessionID: donationData.sessionID,
      });

      if (res.data.success) {
        await saveDonation(donationData);
        setStatus("✅ تم الدفع بنجاح");
        localStorage.removeItem("donation_data");

        setTimeout(() => {
          navigate("/thank-you"); // ← توجيه بعد الدفع
        }, 1500);
      } else {
        setStatus(res.data.message || "❌ حدث خطأ أثناء تأكيد الدفع");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ فشل في الاتصال بالخادم");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold mb-4">أدخل كود OTP</h2>

      <input
        type="text"
        maxLength={4}
        className="border p-2 w-full mb-2 text-center"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />

      <button
        onClick={handleConfirm}
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
      >
        تأكيد الدفع
      </button>

      {status && <div className="mt-4">{status}</div>}
    </div>
  );
}

export default OtpConfirmationPage;
