// src/components/Hero.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <div className="bg-blue-50 py-20 text-center">
      <h1 className="text-4xl font-bold text-blue-800 mb-4">ساهم في سقيا الماء</h1>
      <p className="text-lg text-gray-700 mb-6">
        تبرّع الآن لتوفير الماء النقي للمساجد والمحتاجين
      </p>
      <Link to="/donate">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg">
          التبرّع الآن
        </button>
      </Link>
    </div>
  );
}
