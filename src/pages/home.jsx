import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/* ── إحصائيات ── */
const STATS = [
  { id: "s1", target: 1240, label: "كرتونة موزعة" },
  { id: "s2", target: 38,   label: "مسجد مستفيد"  },
  { id: "s3", target: 320,  label: "متبرع كريم"   },
];

const STEPS = [
  { icon: "🛒", num: "١", title: "اختر الكمية",      desc: "حدد عدد كراتين الماء التي تريد التبرع بها — كل كرتونة بـ 6 دينار فقط" },
  { icon: "💳", num: "٢", title: "أكمل الدفع",       desc: "ادفع بسهولة عبر مصرف التجارة والتنمية — وستصلك رسالة تأكيد فور الانتهاء" },
  { icon: "🚚", num: "٣", title: "نتكفل بالتوصيل",  desc: "فريقنا يوصل الكراتين مباشرة إلى المساجد في بنغازي بدون أي جهد منك" },
  { icon: "🕌", num: "٤", title: "الأجر لك",         desc: "كل من يشرب من هذا الماء في بيت الله، يكتب لك أجره إن شاء الله" },
];

const FEATURES = [
  { icon: "🕌", title: "خدمة المساجد",  desc: "نوصل الماء مباشرة لبيوت الله في بنغازي" },
  { icon: "🤝", title: "شفافية تامة",   desc: "نوثق كل عملية توصيل ونشاركها مع المتبرعين" },
  { icon: "⚡", title: "توصيل سريع",    desc: "نضمن وصول الكراتين خلال أقصر وقت ممكن" },
  { icon: "💰", title: "سعر مناسب",     desc: "6 دينار فقط للكرتونة — ميسور لكل أحد" },
];

/* ── عداد متحرك ── */
function useCountUp(ref, target, duration = 1800) {
  useEffect(() => {
    if (!ref.current) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      ref.current.textContent = Math.floor(progress * target).toLocaleString("ar-EG");
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [ref, target, duration]);
}

function StatItem({ target, label }) {
  const ref = useRef(null);
  useCountUp(ref, target);
  return (
    <div style={s.statItem}>
      <span ref={ref} style={s.statNum}>0</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="page-wrapper" style={{ paddingTop: 0 }}>

      {/* ══════════ HERO ══════════ */}
      <section style={s.hero}>
        <div style={s.heroBg} />

        {/* فقاعات */}
        {[
          { w:60,  l:"8%",  dur:"8s",  delay:"0s"   },
          { w:30,  l:"22%", dur:"11s", delay:"2s"   },
          { w:80,  l:"68%", dur:"9s",  delay:"1s"   },
          { w:20,  l:"84%", dur:"7s",  delay:"3s"   },
          { w:50,  l:"48%", dur:"13s", delay:"0.5s" },
          { w:40,  l:"38%", dur:"10s", delay:"4s"   },
        ].map((b, i) => (
          <div key={i} className="bubble" style={{
            ...s.bubble,
            width: b.w, height: b.w,
            left: b.l,
            animationDuration: b.dur,
            animationDelay: b.delay,
          }} />
        ))}

        <div style={s.heroContent}>
          <div className="anim-fadeInUp" style={s.badge}>💧 بنغازي — ليبيا</div>

          <h1 className="anim-fadeInUp anim-delay-1" style={s.heroTitle}>
            <span style={s.highlight}>سقيا ماء</span>
            <br />كل كرتونة أجر
          </h1>

          <p className="anim-fadeInUp anim-delay-2" style={s.heroSub}>
            نوصل كراتين الماء إلى المساجد في بنغازي — ادفع قيمة الكرتونة وسنتكفل بكل شيء.
            مبادرة خيرية من قلب المجتمع.
          </p>

          <div className="anim-fadeInUp anim-delay-3" style={s.heroBtns}>
            <Link to="/donate" className="btn-primary" style={{ maxWidth: 220 }}>
              🛒 تبرع بكرتونة ماء
            </Link>
            <a href="#how" className="btn-secondary" style={{ maxWidth: 180 }}>
              كيف يعمل؟
            </a>
          </div>
        </div>

        {/* موجات */}
        <div style={s.waveContainer}>
          {[
            { cls: "wave1", opacity: 0.4,  d: "M0,60 C180,100 360,20 540,60 C720,100 900,20 1080,60 C1260,100 1440,20 1440,60 L1440,120 L0,120 Z", fill: "rgba(26,111,181,0.4)" },
            { cls: "wave2", opacity: 0.25, d: "M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 L1440,40 L1440,120 L0,120 Z",                      fill: "rgba(0,212,255,0.2)" },
            { cls: "wave3", opacity: 0.8,  d: "M0,80 C150,40 300,100 450,80 C600,60 750,100 900,80 C1050,60 1200,100 1440,80 L1440,120 L0,120 Z",   fill: "rgba(13,37,69,0.9)" },
          ].map((w) => (
            <div key={w.cls} style={{ ...s.wave, opacity: w.opacity, animation: `wave-move ${w.cls === "wave1" ? "6s" : w.cls === "wave2" ? "9s" : "12s"} linear infinite${w.cls === "wave2" ? " reverse" : ""}` }}>
              <svg viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
                <path d={w.d} fill={w.fill} />
              </svg>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <div style={s.statsBar}>
        {STATS.map((st) => <StatItem key={st.id} target={st.target} label={st.label} />)}
        <div style={s.statItem}>
          <span style={s.statNum}>6</span>
          <span style={s.statLabel}>دينار / الكرتونة</span>
        </div>
      </div>

      <div className="divider" />

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how" className="section">
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <span className="section-tag">الطريقة</span>
          <h2 className="section-title">كيف يعمل <span>سقيا ماء</span>؟</h2>
        </div>

        <div style={s.stepsGrid}>
          {STEPS.map((step) => (
            <div key={step.num} className="card" style={s.stepCard}>
              <div style={s.stepIcon}>{step.icon}</div>
              <div style={s.stepNum}>{step.num}</div>
              <h3 style={s.stepTitle}>{step.title}</h3>
              <p style={s.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ══════════ ABOUT ══════════ */}
      <section className="section" style={{ paddingTop: "4rem" }}>
        <div style={s.aboutGrid}>
          <div>
            <span className="section-tag">عن المبادرة</span>
            <h2 className="section-title" style={{ marginBottom: "1.2rem" }}>
              مبادرة خيرية<br /><span>من بنغازي</span>
            </h2>
            <p style={s.aboutP}>
              سقيا ماء مبادرة أطلقها مجموعة من الأصدقاء بهدف توصيل كراتين المياه إلى مساجد
              بنغازي وتسهيل عملية التبرع على أبناء المدينة.
            </p>
            <p style={s.aboutP}>
              فكرتنا بسيطة: أنت تدفع قيمة الكرتونة، ونحن نتكفل بكل شيء — من الشراء إلى
              التوصيل. والأجر لك بإذن الله.
            </p>
            <p style={{ ...s.aboutP, color: "var(--cyan)", fontWeight: 600 }}>
              "من سقى مسلماً على ظمأ، سقاه الله من الرحيق المختوم"
            </p>
            <Link to="/donate" className="btn-primary" style={{ maxWidth: 220, marginTop: "1.5rem" }}>
              💧 تبرع الآن
            </Link>
          </div>

          <div style={s.featuresCol}>
            {FEATURES.map((f) => (
              <div key={f.title} className="card" style={s.featureItem}>
                <div style={s.featureIcon}>{f.icon}</div>
                <div>
                  <h4 style={s.featureTitle}>{f.title}</h4>
                  <p style={s.featureDesc}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={s.footer}>
        <div style={s.footerLogo}>💧 سقيا ماء</div>
        <p style={s.footerSub}>بنغازي، ليبيا — مبادرة خيرية لسقيا المساجد</p>
        <div style={s.footerLinks}>
          <a href="tel:+" style={s.footerLink}>📱 تواصل معنا</a>
          <a href="#" style={s.footerLink}>📍 بنغازي</a>
          <a href="https://wa.me/218" style={s.footerLink}>💬 واتساب</a>
        </div>
        <p style={s.footerCopy}>© 2025 سقيا ماء — جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}

/* ── Styles ── */
const s = {
  /* HERO */
  hero: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "7rem 1.5rem 10rem",
  },
  heroBg: {
    position: "absolute", inset: 0,
    background: `
      radial-gradient(ellipse 80% 60% at 50% 120%, rgba(26,111,181,0.4) 0%, transparent 70%),
      radial-gradient(ellipse 60% 40% at 20% 50%, rgba(0,212,255,0.1) 0%, transparent 60%),
      linear-gradient(180deg, #0a1628 0%, #0d2545 60%, #0a2035 100%)
    `,
  },
  bubble: {
    position: "absolute",
    borderRadius: "50%",
    background: "rgba(0,212,255,0.08)",
    border: "1px solid rgba(0,212,255,0.15)",
    animationName: "float-up",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  heroContent: {
    position: "relative", zIndex: 2,
    textAlign: "center", maxWidth: 780,
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: "0.5rem",
    background: "rgba(0,212,255,0.1)",
    border: "1px solid rgba(0,212,255,0.3)",
    color: "var(--cyan)",
    padding: "0.4rem 1.2rem",
    borderRadius: "50px",
    fontSize: "0.85rem", fontWeight: 600,
    marginBottom: "1.5rem",
  },
  heroTitle: {
    fontSize: "clamp(2.8rem,8vw,5.5rem)",
    fontWeight: 900, lineHeight: 1.1,
    marginBottom: "1rem",
  },
  highlight: {
    background: "linear-gradient(135deg, #2a9fd6, #00d4ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSub: {
    fontSize: "1.15rem", color: "var(--text-muted)",
    lineHeight: 1.85, marginBottom: "2.2rem",
    maxWidth: 540, margin: "0 auto 2.2rem",
  },
  heroBtns: {
    display: "flex", gap: "1rem",
    justifyContent: "center", flexWrap: "wrap",
  },
  waveContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 180, overflow: "hidden",
  },
  wave: {
    position: "absolute", bottom: 0,
    width: "200%", height: "100%",
  },

  /* STATS */
  statsBar: {
    background: "rgba(13,37,69,0.9)",
    borderTop: "1px solid rgba(0,212,255,0.1)",
    borderBottom: "1px solid rgba(0,212,255,0.1)",
    padding: "2rem 3rem",
    display: "flex",
    justifyContent: "center",
    gap: "3.5rem",
    flexWrap: "wrap",
  },
  statItem: { textAlign: "center" },
  statNum: {
    fontFamily: "'Cairo', sans-serif",
    fontSize: "2.4rem", fontWeight: 900,
    color: "var(--cyan)", display: "block",
  },
  statLabel: { fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" },

  /* STEPS */
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px,1fr))",
    gap: "1.5rem",
    maxWidth: 900, margin: "0 auto",
  },
  stepCard: { textAlign: "center", padding: "1.8rem" },
  stepIcon: { fontSize: "2.4rem", marginBottom: "0.6rem" },
  stepNum: {
    width: 46, height: 46,
    background: "linear-gradient(135deg, #1a6fb5, #00d4ff)",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Cairo', sans-serif", fontSize: "1.2rem", fontWeight: 900,
    margin: "0 auto 1rem",
  },
  stepTitle: { fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.5rem" },
  stepDesc: { fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.7 },

  /* ABOUT */
  aboutGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4rem",
    alignItems: "center",
  },
  aboutP: { color: "var(--text-muted)", lineHeight: 1.9, fontSize: "0.97rem", marginBottom: "1rem" },
  featuresCol: { display: "flex", flexDirection: "column", gap: "1rem" },
  featureItem: { display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.3rem" },
  featureIcon: { fontSize: "1.7rem", flexShrink: 0 },
  featureTitle: { fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.2rem" },
  featureDesc: { fontSize: "0.8rem", color: "var(--text-muted)" },

  /* FOOTER */
  footer: {
    background: "rgba(0,0,0,0.3)",
    borderTop: "1px solid rgba(0,212,255,0.1)",
    padding: "2.5rem 2rem",
    textAlign: "center",
  },
  footerLogo: {
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1.7rem", fontWeight: 900, color: "var(--cyan)",
    marginBottom: "0.4rem",
  },
  footerSub: { fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.2rem" },
  footerLinks: { display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.2rem" },
  footerLink: { color: "var(--text-muted)", textDecoration: "none", fontSize: "0.88rem" },
  footerCopy: { fontSize: "0.78rem", color: "rgba(138,180,204,0.4)" },
};
