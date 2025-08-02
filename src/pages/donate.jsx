import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import PropTypes from 'prop-types'; 
import { db } from "../firebase";
import axios from "axios";


function DonateForm() {
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [selectedMosque, setSelectedMosque] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const snapshot = await getDocs(collection(db, "mosques"));
        const mosquesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setMosques(mosquesList);
      } catch (error) {
        console.error("فشل في جلب المساجد من Firebase:", error);
        setStatus("❌ فشل في تحميل قائمة المساجد");
      }
    };

    fetchMosques();
  }, []);

  const convertToEnglishDigits = (input) => {
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return input.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
  };

  const validateInputs = (phoneNumber) => {
    // تنظيف الرقم وإزالة أي أحرف غير رقمية باستثناء علامة +
    const cleaned = convertToEnglishDigits(phoneNumber.replace(/[^\d+]/g, ""));
    
    // التحقق من أن الرقم يبدأ بـ +218 ويتكون من 9 أرقام بعده
    const phoneRegex = /^\+218\d{9}$/;
    
    if (!selectedMosque) {
      setStatus("❗ الرجاء اختيار المسجد");
      return false;
    }
    
    if (!cleaned) {
      setStatus("❗ الرجاء إدخال رقم الهاتف");
      return false;
    }
    
    if (!phoneRegex.test(cleaned)) {
      setStatus("❗ رقم الهاتف غير صالح (يجب أن يبدأ بـ +218 ويحتوي على 9 أرقام بعده)");
      return false;
    }
    
    if (quantity < 1 || quantity > 50) {
      setStatus("❗ العدد يجب أن يكون بين 1 و50");
      return false;
    }
    
    return cleaned; // نعيد الرقم النظيف
  };

  const processSessionID = (sessionID) => {
    const processedID = (sessionID || "").toString().trim().toUpperCase();
    
    if (processedID === "BAL") {
      setStatus("❌ الرصيد غير كافي");
      return null;
    }

    if (processedID === "ACC") {
      setStatus("❌ الرقم غير مفعل بالخدمة");
      return null;
    }

    if (!processedID || processedID.length < 10) {
      setStatus("❌ رد غير متوقع من المصرف");
      return null;
    }

    return processedID;
  };

  const sendOTP = async (phoneNumber, sessionID) => {
    try {
      const response = await axios.post("https://api.saniah.ly/send-otp", {
        phone: phoneNumber,
        sessionID,
      });
      
      if (!response.data.success) {
        throw new Error("فشل في إرسال OTP");
      }
      
      return response.data;
    } catch (error) {
      console.error("Error sending OTP:", error);
      throw error;
    }
  };

  const handleDonationError = (error) => {
    console.error("Donation error:", error);
    
    let errorMessage = "❌ فشل في عملية التبرع";
    if (error.response) {
      errorMessage = `❌ ${error.response.data.message || errorMessage}`;
    } else if (error.request) {
      errorMessage = "❌ لا يوجد اتصال بالخادم";
    } else {
      errorMessage = `❌ ${error.message || errorMessage}`;
    }
    
    setStatus(errorMessage);
    
    if (retryCount < 2) {
      setRetryCount(retryCount + 1);
    }
  };

  const handleDonate = async () => {
    if (isLoading) return;
    
    // تنظيف الرقم والتحقق منه
    const cleanedPhone = convertToEnglishDigits(phone.replace(/[^\d+]/g, ""));
    const validatedPhone = validateInputs(cleanedPhone);
    if (!validatedPhone) return;

    setIsLoading(true);
    setStatus(null);

    try {
      // Step 1: Process payment
      const paymentRes = await axios.post("https://api.saniah.ly/pay", {
        customer: validatedPhone,
        quantity,
      });

      // Step 2: Validate session ID
      const sessionID = processSessionID(paymentRes.data.sessionID);
      if (!sessionID) return;

      // Step 3: Send OTP
      await sendOTP(validatedPhone, sessionID);
      
      // Step 4: Save data and navigate
      localStorage.setItem(
        "donation_data",
        JSON.stringify({
          phone: validatedPhone,
          quantity,
          mosque: selectedMosque,
          sessionID,
          timestamp: new Date().toISOString(),
        })
      );

      navigate("/confirm", {
        state: {
          phone: validatedPhone,
          sessionID,
        },
      });
      
    } catch (err) {
      handleDonationError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setStatus(null);
    handleDonate();
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-center">تبرع بالأستيكة</h2>

      <div className="space-y-4">
        <select
          className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500"
          value={selectedMosque}
          onChange={(e) => setSelectedMosque(e.target.value)}
          disabled={isLoading}
        >
          <option value="">اختر المسجد</option>
          {mosques.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>

        <input
          type="tel"
          placeholder="رقم الهاتف (مثال: +2189XXXXXXXX)"
          className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
        />

        <input
          type="number"
          min={1}
          max={50}
          className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          disabled={isLoading}
        />

        <button
          onClick={handleDonate}
          disabled={isLoading}
          className={`bg-blue-600 text-white px-4 py-2 rounded-lg w-full hover:bg-blue-700 transition-colors ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                {/* SVG spinner */}
              </svg>
              جاري المعالجة...
            </span>
          ) : (
            "تبرع الآن"
          )}
        </button>

        {retryCount > 0 && (
          <button
            onClick={handleRetry}
            className="text-blue-600 text-sm underline hover:text-blue-800"
          >
            إعادة المحاولة ({3 - retryCount} محاولات متبقية)
          </button>
        )}

        {status && (
          <div
            className={`mt-2 text-center p-2 rounded ${
              status.includes("❌") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}



export default DonateForm;
