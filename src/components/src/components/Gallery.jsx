// src/components/Gallery.jsx
import React from 'react';

export default function Gallery() {
  const images = ['/images/d1.jpg', '/images/d2.jpg', '/images/d3.jpg'];
  return (
    <div className="py-12 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {images.map((src, idx) => (
        <img key={idx} src={src} alt={`حملة ${idx + 1}`} className="rounded-lg shadow-md" />
      ))}
    </div>
  );
}
