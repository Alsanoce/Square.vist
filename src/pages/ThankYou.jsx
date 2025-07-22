// src/pages/ThankYou.jsx

function ThankYou() {
  return (
    <div className="p-6 max-w-lg mx-auto text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">جزاك الله خيرًا 🌿</h1>
      <p className="text-lg mb-4">
        تم استلام تبرعك بنجاح وسيتم توصيل الماء للمستفيدين في أقرب وقت.
      </p>
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded">
        <p className="font-semibold">💡 نصيحة دينية:</p>
        <p className="text-sm mt-2">
          قال النبي ﷺ: "أفضل الصدقة سقي الماء" — رواه أحمد
        </p>
      </div>
    </div>
  );
}

export default ThankYou;
