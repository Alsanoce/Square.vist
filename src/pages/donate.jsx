import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function DonateForm() {
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [selectedMosque, setSelectedMosque] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const res = await fetch("https://firestore.googleapis.com/v1/projects/whater-f15d4/databases/(default)/documents/mosques");
        const data = await res.json();
        const mosquesList = data.documents?.map((doc) => ({
          id: doc.name.split("/").pop(),
          name: doc.fields.name.stringValue,
        })) || [];
        setMosques(mosquesList);
      } catch (error) {
        console.error("فشل في جلب المساجد:", error);
      }
    };
    fetchMosques();
  }, []);

  const convertToEnglishDigits = (input) => {
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return input.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
  };

  const validateInputs = () => {
    const cleaned = convertToEnglishDigits(phone.trim().replace(/\s/g, ""));
    const phoneRegex = /^9\d{8}$/;
    if (!selectedMosque || !cleaned || quantity < 1) {
      setStatus("❗ الرجاء تعبئة جميع الحقول بشكل صحيح");
      return false;
    }
    if (!phoneRegex.test(cleaned)) {
      setStatus("❗ رقم الهاتف غير صالح (يجب أن يبدأ بـ9 ويحتوي على 9 أرقام)");
      return false;
    }
    if (quantity < 1 || quantity > 50) {
      setStatus("❗ العدد يجب أن يكون بين 2 و50");
      return false;
    }
    return true;
  };

  const handleDonate = async () => {
    const cleanedPhone = convertToEnglishDigits(phone.trim().replace(/\s/g, ""));

    if (!validateInputs()) return;

    try {
      const res = await axios.post("https://api.saniah.ly/pay", {
        customer: cleanedPhone,
        quantity: quantity,
      });

      if (!res.data.sessionID) {
        setStatus("❌ لم يتم العثور على الرقم في النظام المصرفي");
        return;
      }

      localStorage.setItem("donation_data", JSON.stringify({
        phone: cleanedPhone,
        quantity,
        mosque: selectedMosque,
        sessionID: res.data.sessionID,
      }));

      navigate("/confirm");
    } catch (err) {
      console.error(err);
      setStatus("❌ فشل الاتصال بالخادم أو الرقم غير مفعل بالخدمة");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-green-700 mb-4">ساهم في سقيا المساجد</h1>

        <select
          className="border p-2 w-full rounded mb-3"
          value={selectedMosque}
          onChange={(e) => setSelectedMosque(e.target.value)}
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
          placeholder="رقم الهاتف (مثال: 92xxxxxxx)"
          className="border p-2 w-full rounded mb-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          type="number"
          min={1}
          max={50}
          className="border p-2 w-full rounded mb-4"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        <button
          onClick={handleDonate}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded w-full"
        >
          تبرع الآن
        </button>

        {status && <div className="mt-4 text-center text-red-600">{status}</div>}
      </div>
    </div>
  );
}

export default DonateForm;
