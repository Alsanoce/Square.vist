import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";

function Donate() {
  const [phone, setPhone] = useState("");
  const [mosque, setMosque] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  const saveToFirestore = async ({ phone, mosque, quantity, sessionID }) => {
    try {
      await addDoc(collection(db, "donations"), {
        phone,
        mosque,
        quantity,
        sessionID,
        status: "pending",
        timestamp: new Date().toISOString(),
      });
      console.log("✅ تم تخزين الطلب في Firestore");
    } catch (error) {
      console.error("❌ خطأ في التخزين:", error);
    }
  };

  const handleDonate = async () => {
    if (!phone || !mosque || !quantity) {
      setStatus("❌ يرجى تعبئة جميع الحقول");
      return;
    }

    try {
      const res = await axios.post("https://api.saniah.ly/pay", {
        phone,
        mosque,
        quantity,
      });

      const data = res.data;

      if (data.status === "OTP_SENT" && data.sessionID) {
        const donationData = {
          phone,
          mosque,
          quantity,
          sessionID: data.sessionID,
        };

        // ✅ حفظ البيانات محليًا
        localStorage.setItem("donation_data", JSON.stringify(donationData));

        // ✅ حفظ في Firestore بوضعية pending
        await saveToFirestore(donationData);

        // ✅ التوجيه لصفحة تأكيد OTP
        navigate("/confirm");
      } else {
        // ✅ معالجة الأخطاء حسب أكواد الدفع
        switch (data.status) {
          case "PW1":
            setStatus("❌ كلمة مرور الخدمة غير صحيحة (PW1)");
            break;
          case "PW":
            setStatus("❌ كود PIN غير صحيح (PW)");
            break;
          case "Limit":
            setStatus("❌ المبلغ يتجاوز الحد المسموح به (Limit)");
            break;
          case "ACC":
            setStatus("❌ رقم الزبون غير موجود (ACC)");
            break;
          case "Bal":
            setStatus("❌ الرصيد غير كافي (Bal)");
            break;
          default:
            setStatus(data.message || "❌ حدث خطأ أثناء تنفيذ العملية");
        }
      }
    } catch (error) {
      console.error("❌ فشل في الاتصال بالخادم:", error);
      setStatus("❌ تعذر الاتصال بالخادم");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold mb-4">تبرع الآن</h2>

      <input
        type="text"
        placeholder="رقم الهاتف"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <input
        type="text"
        placeholder="اسم المسجد"
        value={mosque}
        onChange={(e) => setMosque(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="border p-2 w-full mb-2"
      />

      <button
        onClick={handleDonate}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        تأكيد التبرع
      </button>

      {status && <div className="mt-4 text-red-600">{status}</div>}
    </div>
  );
}

export default Donate;
