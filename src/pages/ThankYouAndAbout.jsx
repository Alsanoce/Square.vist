// ─── ThankYou ───────────────────────────────────────────────
import { Link } from "react-router-dom";

export function ThankYou() {
  return (
    <div className="page-wrapper">
      <div className="section" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div className="card" style={{ padding: "3rem 2rem" }}>
          <div style={{ fontSize: "5rem", marginBottom: "1.2rem" }}>💧</div>

          <h1 style={{
            fontFamily: "'Cairo', sans-serif",
            fontSize: "2rem", fontWeight: 900,
            color: "var(--cyan)", marginBottom: "0.8rem",
          }}>
            جزاك الله خيراً!
          </h1>

          <p style={{ color: "var(--text-muted)", lineHeight: 1.9, marginBottom: "2rem" }}>
            تم استلام تبرعك بنجاح.<br />
            سيتولى فريقنا توصيل كراتين الماء للمسجد المحدد قريباً إن شاء الله.<br />
            <span style={{ color: "var(--cyan)", fontWeight: 600 }}>
              وكل قطرة تُسقى، يكتب لك أجرها.
            </span>
          </p>

          <div style={{
            background: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.15)",
            borderRadius: 14, padding: "1.2rem",
            marginBottom: "2rem",
            fontSize: "0.88rem", color: "var(--text-muted)",
          }}>
            "من سقى مسلماً على ظمأ، سقاه الله من الرحيق المختوم"
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link to="/" className="btn-secondary" style={{ flex: 1, minWidth: 140 }}>
              🏠 الرئيسية
            </Link>
            <Link to="/donate" className="btn-primary" style={{ flex: 1, minWidth: 140 }}>
              💧 تبرع مجدداً
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── About ──────────────────────────────────────────────────
export function About() {
  const team = [
    { icon: "👨‍💼", name: "فريق التوصيل",   desc: "يتكفل بإيصال الماء لكل مسجد" },
    { icon: "📊", name: "فريق المتابعة",  desc: "يوثق كل عملية ويشاركها" },
    { icon: "💻", name: "فريق التقنية",   desc: "يدير المنصة والدفع الإلكتروني" },
  ];

  return (
    <div className="page-wrapper">
      {/* Hero */}
      <div style={{
        background: "linear-gradient(180deg, #0d2545 0%, #0a1628 100%)",
        padding: "5rem 1.5rem 4rem",
        textAlign: "center",
        borderBottom: "1px solid rgba(0,212,255,0.1)",
      }}>
        <span className="section-tag">عن المبادرة</span>
        <h1 className="section-title" style={{ maxWidth: 600, margin: "0 auto 1rem" }}>
          قصة <span>سقيا ماء</span>
        </h1>
        <p style={{ color: "var(--text-muted)", maxWidth: 540, margin: "0 auto", lineHeight: 1.9 }}>
          مبادرة خيرية انطلقت من بنغازي لتوصيل كراتين الماء إلى المساجد
          وتسهيل عملية التبرع على أبناء المدينة.
        </p>
      </div>

      <div className="section" style={{ maxWidth: 900 }}>

        {/* Story */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ color: "var(--cyan)", marginBottom: "1rem", fontFamily: "'Cairo', sans-serif" }}>
            كيف بدأت الفكرة؟
          </h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.9 }}>
            بدأت سقيا ماء كفكرة بسيطة بين مجموعة من الأصدقاء — كانوا يلاحظون حاجة
            المساجد للمياه خاصةً في أوقات الصلاة، وصعوبة التبرع بشكل منظم. فكان الحل:
            منصة إلكترونية يدفع فيها المتبرع قيمة الكرتونة، ونتكفل نحن بكل شيء.
          </p>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.9, marginTop: "1rem" }}>
            اليوم نخدم أكثر من 38 مسجداً في بنغازي، وننمو كل يوم بفضل كرم المتبرعين.
          </p>
        </div>

        {/* Team */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1.2rem", marginBottom: "2rem" }}>
          {team.map((t) => (
            <div key={t.name} className="card" style={{ textAlign: "center", padding: "1.8rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.7rem" }}>{t.icon}</div>
              <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: "1rem", marginBottom: "0.4rem" }}>{t.name}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{t.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <Link to="/donate" className="btn-primary" style={{ maxWidth: 240, margin: "0 auto" }}>
            💧 انضم وتبرع الآن
          </Link>
        </div>
      </div>
    </div>
  );
}
