export default function Home() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold text-green-700">مرحبا بك في سقيا الخير 💧</h1>

      <p className="text-gray-700">ساهم في تبرع الماء للمساجد والمحتاجين بسهولة من خلال المنصة</p>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-bold text-green-600">عدد المساجد</h2>
          <p className="text-xl text-gray-800">+40</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-bold text-green-600">تبرعات اليوم</h2>
          <p className="text-xl text-gray-800">18</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 col-span-2">
          <h2 className="font-bold text-green-600">آخر تبرع</h2>
          <p className="text-gray-800">بواسطة 092xxxxxxx - 4 أستيكات</p>
        </div>
      </div>

      <button className="mt-6 bg-green-600 text-white py-2 px-6 rounded-xl shadow">
        التبرع الآن
      </button>
    </div>
  );
}
