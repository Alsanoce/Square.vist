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
        console.error("فشل في جلب المساجد من Firebase:", error);
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
      setStatus("❗ العدد يجب أن يكون بين 1 و50");
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

    console.log("📦 كامل الرد من السيرفر:", res.data);

    const { success, sessionID } = res.data;

    if (success && sessionID) {
      localStorage.setItem(
        "donation_data",
        JSON.stringify({
          phone: cleanedPhone,
          quantity,
          mosque: selectedMosque,
          sessionID: sessionID,
        })
      );
      navigate("/confirm");
    } else {
      setStatus("❌ فشل الاتصال بالخادم أو الرقم غير مفعل بالخدمة");
    }
  } catch (err) {
    console.error(err);
    setStatus("❌ حدث خطأ أثناء الاتصال بالخادم");
  }
};


  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold">تبرع بالأستيكة</h2>

      <select
        className="border p-2 w-full"
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
        placeholder="رقم الهاتف (مثال: 92*******)"
        className="border p-2 w-full"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <input
        type="number"
        min={1}
        max={50}
        className="border p-2 w-full"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />

      <button
        onClick={handleDonate}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        تبرع الآن
      </button>

      {status && <div className="mt-2 text-center text-red-600">{status}</div>}
    </div>
  );
}

export default DonateForm;
