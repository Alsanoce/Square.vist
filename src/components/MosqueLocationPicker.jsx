import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BENGHAZI_CENTER = [32.1167, 20.0667];

const markerIcon = L.divIcon({
  className: "mosque-location-marker",
  html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#00d4ff;border:3px solid #fff;box-shadow:0 0 0 7px rgba(0,212,255,.24),0 10px 24px rgba(0,0,0,.35);"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function toGoogleMapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function parseGoogleMapsLocation(value) {
  const match = String(value || "").match(/q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  return {
    lat: Number(match[1]),
    lng: Number(match[2]),
    url: value,
  };
}

export default function MosqueLocationPicker({ confirmedLocation, onConfirm, onError }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [draft, setDraft] = useState(() => parseGoogleMapsLocation(confirmedLocation));
  const [isLocating, setIsLocating] = useState(false);

  const placeMarker = (point) => {
    if (!mapRef.current || !point) return;

    const latLng = [point.lat, point.lng];

    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, { icon: markerIcon }).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(latLng);
    }
  };

  const setPoint = (lat, lng, zoom = 16) => {
    const point = { lat, lng, url: toGoogleMapsUrl(lat, lng) };
    setDraft(point);
    placeMarker(point);

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], zoom);
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: BENGHAZI_CENTER,
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    mapRef.current = map;

    L.control.zoom({ position: "bottomleft" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (event) => {
      setPoint(event.latlng.lat, event.latlng.lng, map.getZoom());
    });

    window.setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const parsed = parseGoogleMapsLocation(confirmedLocation);
    if (!parsed) return;

    setDraft(parsed);
    placeMarker(parsed);

    if (mapRef.current) {
      mapRef.current.setView([parsed.lat, parsed.lng], 16);
    }
  }, [confirmedLocation]);

  const locateUser = () => {
    if (!navigator.geolocation) {
      onError?.("المتصفح لا يدعم تحديد الموقع. استخدم الخيار اليدوي أسفل الخريطة.");
      return;
    }

    setIsLocating(true);
    onError?.("");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPoint(coords.latitude, coords.longitude, 17);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        onError?.("تعذر تحديد الموقع. تأكد من السماح للمتصفح باستخدام موقعك.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const confirmLocation = () => {
    if (!draft) {
      onError?.("حدد موقع المسجد على الخريطة أولاً.");
      return;
    }

    onError?.("");
    onConfirm?.(draft);
  };

  return (
    <div style={s.wrapper}>
      <div ref={containerRef} style={s.map} />

      <div style={s.actions}>
        <button type="button" onClick={locateUser} disabled={isLocating} style={s.secondaryButton}>
          {isLocating ? "جاري تحديد الموقع..." : "موقعي الحالي"}
        </button>
        <button type="button" onClick={confirmLocation} style={s.primaryButton}>
          اعتماد الموقع
        </button>
      </div>

      <p style={s.hint}>
        اضغط على مكان المسجد داخل الخريطة أو استخدم موقعك الحالي، ثم اضغط اعتماد الموقع.
      </p>

      {confirmedLocation && (
        <a href={confirmedLocation} target="_blank" rel="noreferrer" style={s.confirmedLink}>
          تم اعتماد موقع المسجد - فتح في Google Maps
        </a>
      )}
    </div>
  );
}

const s = {
  wrapper: {
    display: "grid",
    gap: "0.75rem",
  },
  map: {
    width: "100%",
    height: 280,
    borderRadius: 14,
    border: "1px solid rgba(0,212,255,0.25)",
    overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
  },
  primaryButton: {
    minHeight: 46,
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, var(--blue-bright), var(--cyan))",
    color: "#fff",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.9rem",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0.75rem",
  },
  secondaryButton: {
    minHeight: 46,
    border: "1px solid rgba(0,212,255,0.3)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    color: "var(--cyan)",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.9rem",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0.75rem",
  },
  hint: {
    color: "var(--text-muted)",
    fontSize: "0.78rem",
    lineHeight: 1.7,
    margin: 0,
  },
  confirmedLink: {
    color: "var(--success)",
    fontSize: "0.84rem",
    fontWeight: 800,
    textDecoration: "none",
  },
};
