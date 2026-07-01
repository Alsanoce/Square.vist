import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { callEdfaaly } from "../lib/edfaalyApi";
import { CARTON_PRICE } from "../lib/donationPricing";

const HERO_IMAGE = "/images/al-badriya-mosque-hero.jpg";
const MIN_QUICK_QUANTITY = 10;
const QUICK_STEP = 10;

const FALLBACK_STATS = {
  donorsCount: 320,
  mosquesServed: 38,
  cartonsDistributed: 1240,
  completedProjects: 48,
};

const REQUEST_CARDS = [
  {
    mosque: "مسجد البدرية",
    area: "بنغازي، الكويفية",
    requested: 20,
    funded: 8,
    status: "معتمد",
  },
  {
    mosque: "مسجد الفتح",
    area: "بنغازي، السلماني",
    requested: 40,
    funded: 24,
    status: "ممول جزئيًا",
  },
  {
    mosque: "مسجد الرحمة",
    area: "بنغازي، الحدائق",
    requested: 10,
    funded: 0,
    status: "بانتظار الدعم",
  },
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ar-EG");
}

function numberOrFallback(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function useCountUp(ref, target, duration = 1200) {
  useEffect(() => {
    if (!ref.current) return undefined;

    let start = null;
    let frameId = 0;

    const step = (timestamp) => {
      if (!ref.current) return;
      if (!start) start = timestamp;

      const progress = Math.min((timestamp - start) / duration, 1);
      ref.current.textContent = formatNumber(Math.round(target * progress));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [ref, target, duration]);
}

function StatCard({ value, label }) {
  const ref = useRef(null);
  useCountUp(ref, value);

  return (
    <div className="home-stat-card">
      <strong ref={ref}>0</strong>
      <span>{label}</span>
    </div>
  );
}

function RequestCard({ item }) {
  const remaining = Math.max(item.requested - item.funded, 0);
  const progress = item.requested > 0 ? Math.round((item.funded / item.requested) * 100) : 0;

  return (
    <article className="mosque-request-card">
      <div className="request-card-image" aria-hidden="true" />
      <div className="request-card-body">
        <div className="request-card-header">
          <div>
            <h3>{item.mosque}</h3>
            <p>{item.area}</p>
          </div>
          <span>{item.status}</span>
        </div>

        <div className="request-card-numbers">
          <span>يحتاج إلى {formatNumber(item.requested)} كرتونة</span>
          <strong>المتبقي {formatNumber(remaining)}</strong>
        </div>

        <div className="progress-track" aria-label={`نسبة التمويل ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <p className="request-card-trust">
          هذا الطلب مقدم من مسؤول المسجد وتمت مراجعته من فريق سانية.
        </p>

        <div className="request-card-actions">
          <Link to="/donate">ساهم الآن</Link>
          <Link to="/donate">غط المتبقي</Link>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(MIN_QUICK_QUANTITY);
  const [stats, setStats] = useState(FALLBACK_STATS);

  useEffect(() => {
    let cancelled = false;

    callEdfaaly("getPublicStats")
      .then((response) => {
        if (cancelled || !response?.success || !response.stats) return;

        setStats({
          donorsCount: numberOrFallback(response.stats.donorsCount, FALLBACK_STATS.donorsCount),
          mosquesServed: numberOrFallback(response.stats.mosquesServed, FALLBACK_STATS.mosquesServed),
          cartonsDistributed: numberOrFallback(
            response.stats.cartonsDistributed,
            FALLBACK_STATS.cartonsDistributed
          ),
          completedProjects: numberOrFallback(
            response.stats.completedProjects,
            FALLBACK_STATS.completedProjects
          ),
        });
      })
      .catch(() => {
        if (!cancelled) setStats(FALLBACK_STATS);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const total = quantity * CARTON_PRICE;
  const litersProvided = useMemo(
    () => Math.round(numberOrFallback(stats.cartonsDistributed, 0) * 24 * 0.6),
    [stats.cartonsDistributed]
  );

  const updateQuantity = (direction) => {
    setQuantity((current) => Math.max(MIN_QUICK_QUANTITY, current + direction * QUICK_STEP));
  };

  const continueDonation = () => {
    navigate("/donate", {
      state: {
        quickQuantity: quantity,
      },
    });
  };

  return (
    <div className="home-page">
      <section className="home-hero" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="home-hero-overlay" />
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-eyebrow">سقيا ماء للمساجد</span>
            <h1>
              قطرة ماء اليوم..
              <br />
              دعوة مستجابة غدًا
            </h1>
            <p>
              نوصل مياه شرب نقية لمساجد بنغازي، بدعمكم المباشر وبكل شفافية.
            </p>
            <div className="home-hero-actions">
              <Link to="/donate" className="btn-primary home-gold-button">
                تبرع الآن
              </Link>
              <a href="#about-project" className="btn-secondary home-secondary-button">
                تعرف على المشروع
              </a>
            </div>
          </div>

          <div className="quick-donation-card" aria-label="تبرع سريع">
            <span>تبرع الآن</span>
            <h2>اختر كمية كراتين الماء</h2>

            <div className="quick-quantity-control">
              <button type="button" onClick={() => updateQuantity(-1)} aria-label="إنقاص العدد">
                −
              </button>
              <strong>{formatNumber(quantity)}</strong>
              <button type="button" onClick={() => updateQuantity(1)} aria-label="زيادة العدد">
                +
              </button>
            </div>

            <p>كل كرتونة 24 عبوة × 600 مل</p>

            <div className="quick-total">
              <span>الإجمالي</span>
              <strong>{formatNumber(total)} دينار</strong>
            </div>

            <button type="button" className="btn-primary home-gold-button" onClick={continueDonation}>
              متابعة
            </button>
          </div>
        </div>
      </section>

      <section className="home-stats-strip" aria-label="إحصائيات سانية">
        <StatCard value={stats.donorsCount} label="متبرع كريم" />
        <StatCard value={stats.mosquesServed} label="مسجد مستفيد" />
        <StatCard value={litersProvided} label="لتر ماء موفر" />
        <StatCard value={stats.completedProjects} label="مشروع مكتمل" />
      </section>

      <section id="current-needs" className="home-section home-needs-section">
        <div className="home-section-heading">
          <span className="home-eyebrow">احتياجات المساجد الحالية</span>
          <h2>طلبات ماء تمت مراجعتها وتنتظر دعمكم</h2>
          <p>
            طلبات ماء مقدمة من مسؤولي المساجد، تمت مراجعتها من فريق سانية وتنتظر دعمكم.
          </p>
        </div>

        <div className="request-cards-grid">
          {REQUEST_CARDS.map((item) => (
            <RequestCard key={item.mosque} item={item} />
          ))}
        </div>
      </section>

      <section id="about-project" className="home-section about-project-section">
        <div className="about-project-copy">
          <span className="home-eyebrow">عن المشروع</span>
          <h2>منصة خيرية رقمية لسقيا الماء</h2>
          <p>
            تعمل سانية على تنظيم تبرعات المياه للمساجد، من استقبال الاحتياج إلى الدفع والتوصيل والتوثيق.
            الهدف أن تكون كل خطوة واضحة، مختصرة، وقابلة للتتبع.
          </p>
        </div>

        <div className="about-project-grid">
          <div>
            <strong>طلب الماء</strong>
            <span>يقدم مسؤول المسجد طلب الاحتياج.</span>
          </div>
          <div>
            <strong>المراجعة</strong>
            <span>تراجع إدارة سانية الطلب قبل ظهوره.</span>
          </div>
          <div>
            <strong>الدعم</strong>
            <span>يمول المتبرعون الطلب بالكامل أو جزئيًا.</span>
          </div>
          <div>
            <strong>التوثيق</strong>
            <span>يتم رفع إثبات التوصيل بعد التنفيذ.</span>
          </div>
        </div>
      </section>

      <section id="water-request-preview" className="home-section preview-band">
        <div>
          <span className="home-eyebrow">طلب ماء لمسجد</span>
          <h2>قريبًا، طلبات المساجد ستدخل للمراجعة قبل ظهورها للمتبرعين</h2>
        </div>
        <a href="#current-needs" className="btn-secondary home-secondary-button">
          مشاهدة الاحتياجات
        </a>
      </section>

      <section id="reports-preview" className="home-section report-contact-grid">
        <div>
          <span className="home-eyebrow">التقارير</span>
          <h2>تقارير أوضح للتبرعات والتوصيل</h2>
          <p>
            في المراحل القادمة ستظهر تقارير التنفيذ والتوثيق لكل طلب مكتمل.
          </p>
        </div>

        <div id="contact-preview">
          <span className="home-eyebrow">تواصل معنا</span>
          <h2>فريق سانية يتابع الطلبات يدويًا</h2>
          <p>
            عند اكتمال نظام الطلبات، ستصل الإشعارات للإدارة وفريق التوصيل بشكل مباشر.
          </p>
        </div>
      </section>
    </div>
  );
}
