import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";

function DonateForm() {
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [selectedMosque, setSelectedMosque] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

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
        console.error("فشل في جلب المساجد:", error);
        setStatus("❌ فشل تحميل قائمة المساجد");
      }
    };

    fetchMosques();
  }, []);

  const convertToEnglishDigits = (input) => {
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return input.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d));
  };

  const validateInputs = () => {
    const cleanedPhone = convertToEnglishDigits(phone.trim().replace(/\D/g, ""));
    const phoneRegex = /^(218)?(9[1-9]\d{7}|1\d{8})$/; // دعم ليبيا (+218)
    
    if (!selectedMosque || !cleanedPhone || quantity < 1) {
      setStatus("❗ الرجاء تعبئة جميع الحقول");
      return false;
    }
    
    if (!phoneRegex.test(cleanedPhone)) {
      setStatus("❗ رقم الهاتف الليبي غير صالح (يبدأ بـ 9 أو 1 ويتكون من 9 أرقام)");
      return false;
    }
    
    if (quantity < 1 || quantity > 50) {
      setStatus("❗ الكمية يجب أن تكون بين 1 و50");
      return false;
    }
    
    return true;
  };

  const handleDonate = async () => {
    if (isLoading) return;
    
    const cleanedPhone = convertToEnglishDigits(phone.trim().replace(/\D/g, ""));
    
    if (!validateInputs()) return;

    setIsLoading(true);
    setStatus(null);

    try {
      const res = await axios.post("https://api.saniah.ly/pay", {
        customer: `218${cleanedPhone}`, // إضافة مفتاح ليبيا
        quantity: quantity,
        mosque: selectedMosque,
        countryCode: "LY" // إضافة كود الدولة
      });

      const sessionID = (res.data.sessionID || "").toString().trim();

      if (sessionID === "BAL") {
        setStatus("❌ الرصيد غير كافي");
        return;
      }

      if (sessionID === "ACC") {
        setStatus("❌ الرقم غير مفعل بالخدمة");
        return;
      }

      if (!sessionID || sessionID.length < 10) {
        setStatus("❌ استجابة غير متوقعة من نظام الدفع");
        return;
      }

      // حفظ البيانات للتأكيد
      navigate("/confirm", { 
        state: {
          phone: `218${cleanedPhone}`,
          quantity,
          mosque: selectedMosque,
          sessionID
        }
      });

    } catch (err) {
      console.error("خطأ في الدفع:", err);
      setStatus("❌ فشل في إتمام العملية");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-center mb-4">نموذج التبرع</h2>

      <div className="space-y-4">
        <select
          className="w-full p-2 border rounded"
          value={selectedMosque}
          onChange={(e) => setSelectedMosque(e.target.value)}
          disabled={isLoading}
        >
          <option value="">اختر المسجد</option>
          {mosques.map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>

        <div className="flex items-center">
          <span className="p-2 bg-gray-100 border rounded-r-none">+218</span>
          <input
            type="tel"
            placeholder="9XXXXXXX أو 1XXXXXXXX"
            className="flex-1 p-2 border rounded-l-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <input
          type="number"
          min="1"
          max="50"
          className="w-full p-2 border rounded"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          disabled={isLoading}
        />

        <button
          onClick={handleDonate}
          disabled={isLoading}
          className={`w-full p-2 rounded text-white ${
            isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isLoading ? "جاري المعالجة..." : "تبرع الآن"}
        </button>

        {status && (
          <div className={`p-2 text-center rounded ${
            status.includes("❌") ? "bg-red-100 text-red-700" : 
            status.includes("❗") ? "bg-yellow-100 text-yellow-700" : 
            "bg-blue-100 text-blue-700"
          }`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

export default DonateForm;
