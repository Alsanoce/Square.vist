import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";

export default function DonateForm() {
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [selectedMosque, setSelectedMosque] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const pricePerStick = 6;

  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const snapshot = await getDocs(collection(db, "mosques"));
        const mosquesList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setMosques(mosquesList);
      } catch (error) {
        console.error("خطأ في جلب المساجد:", error);
        setStatus("❌ فشل تحميل قائمة المساجد");
      }
    };

    fetchMosques();
  }, []);

  const convertDigits = (input) => {
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return input.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d));
  };

  const validateInputs = (phoneNumber) => {
    const phoneRegex = /^9\d{8}$/;

    if (!selectedMosque || !phoneNumber || quantity < 1) {
      setStatus("❗ الرجاء تعبئة جميع الحقول المطلوبة");
      return false;
    }

    if (!phoneRegex.test(phoneNumber)) {
      setStatus("❗ رقم الهاتف يجب أن يبدأ بـ 9 ويتكون من 9 أرقام");
      return false;
    }

    if (quantity < 1 || quantity > 50) {
      setStatus("❗ عدد الأستيكات يجب أن يكون بين 1 و50");
      return false;
    }

    return true;
  };

  const handleDonate = async () => {
    if (isLoading) return;

    const cleanedPhone = convertDigits(phone.trim().replace(/\D/g, ""));

    if (!validateInputs(cleanedPhone)) return;

    const amount = quantity * pricePerStick;
    const fullPhoneNumber = `+218${cleanedPhone}`; // نضيف +218 هنا فقط عند الإرسال للAPI

    setIsLoading(true);
    setStatus(null);
    console.log("📤 إرسال بيانات الدفع:", {
    customer: fullPhoneNumber,
   amount,
   mosque: selectedMosque,
   quantity,
});


    try {
      const response = await axios.post("https://api.saniah.ly/pay", {
        customer: fullPhoneNumber,
        amount,
        mosque: selectedMosque,
        quantity,
      });

      const sessionID = (response.data.sessionID || "").toString().trim();

      if (sessionID === "BAL") {
        setStatus("❌ الرصيد غير كافي لاتمام العملية");
        return;
      }

      if (sessionID === "ACC") {
        setStatus("❌ الرقم غير مفعل في خدمة الدفع");
        return;
      }

      if (!sessionID || sessionID.length < 10) {
        setStatus("❌ استجابة غير متوقعة من نظام الدفع");
        return;
      }

      const otpResponse = await axios.post("https://api.saniah.ly/send-otp", {
        phone: fullPhoneNumber,
        sessionID,
      });

      if (otpResponse.data.success) {
        navigate("/confirm", {
          state: {
            phone: fullPhoneNumber,
            quantity,
            mosque: selectedMosque,
            sessionID,
          },
        });
      } else {
        setStatus("❌ تمت العملية ولكن لم يتم إرسال الكود");
      }

    } catch (error) {
      console.error("خطأ في عملية الدفع:", error);
      setStatus("❌ فشل في إتمام العملية، الرجاء المحاولة لاحقًا");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">نموذج التبرع</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1">اختر المسجد:</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedMosque}
            onChange={(e) => setSelectedMosque(e.target.value)}
            disabled={isLoading}
          >
            <option value="">-- اختر مسجد --</option>
            {mosques.map((mosque) => (
              <option key={mosque.id} value={mosque.name}>
                {mosque.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">رقم الهاتف (9 خانات تبدأ بـ 9):</label>
          <div className="flex">
            <input
              type="tel"
              placeholder="9XXXXXXXX"
              className="w-full p-2 border rounded"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d]/g, "");
                if (val.length <= 9) setPhone(val);
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label className="block mb-1">عدد الأستيكات (1-50):</label>
          <input
            type="number"
            min="1"
            max="50"
            className="w-full p-2 border rounded"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleDonate}
          disabled={isLoading}
          className={`w-full py-2 rounded text-white ${
            isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isLoading ? "جاري المعالجة..." : "التبرع الآن"}
        </button>

        {status && (
          <div className={`p-2 text-center rounded ${
            status.includes("❌") ? "bg-red-100 text-red-700" :
            status.includes("❗") ? "bg-yellow-100 text-yellow-700" :
            "bg-green-100 text-green-700"
          }`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
