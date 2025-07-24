import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Donate() {
  const [phone, setPhone] = useState("");
  const [mosque, setMosque] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  const handleDonate = async () => {
    if (!phone || !mosque || !quantity) {
      setStatus("❌ يرجى تعبئة جميع الحقول");
      return;
    }

    try {
      const res = await axios.post("https://api.saniah.ly/pay", {
        phone,
        quantity,
        mosque,
      });

      const data = res.data;

      if (data.status === "OTP_SENT" && data.sessionID) {
        localStorage.setItem(
          "donation_data",
          JSON.stringify({
            phone,
            mosque,
            quantity,
            sessionID: data.sessionID,
          })
        );
        navigate("/confirm");
      } else if (data.status === "PW1") {
        setStatus("❌ كلمة المرور خاطئة (PW1)");
      } else if (data.status === "PW") {
        setStatus("❌ كود التاجر (PIN) غير صحيح (PW)");
      } else if (data.status === "Limit") {
        setStatus("❌ القيمة المطلوبة تتجاوز الحد المسموح به (Limit)");
      } else if (data.status === "ACC") {
        setStatus("❌ رقم الزبون غير موجود في النظام البنكي (ACC)");
      } else if (data.status === "Bal") {
        setStatus("❌ الرصيد غير كافي (Bal)");
      } else {
        setStatus(data.message || "❌ حدث خطأ غير معروف أثناء الدفع");
      }
    } catch (error) {
      console.error("❌ فشل في الاتصال بالسيرفر:", error);
      setStatus("❌ تعذر الاتصال بالسيرفر");
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
        placeholder="عدد الأستيكات"
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
