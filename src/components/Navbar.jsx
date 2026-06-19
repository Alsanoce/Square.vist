import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/", label: "الرئيسية" },
  { to: "/about", label: "من نحن" },
  { to: "/donate", label: "تبرع الآن", cta: true },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="site-nav" aria-label="التنقل الرئيسي">
        <Link to="/" className="site-logo" aria-label="سقيا ماء - الرئيسية">
          <span aria-hidden="true">💧</span>
          <span className="site-logo-name">سقيا</span> ماء
        </Link>

        <ul className="site-nav-links">
          {LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`site-nav-link${link.cta ? " site-nav-cta" : ""}${
                  pathname === link.to && !link.cta ? " is-active" : ""
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="site-menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        </button>
      </nav>

      {menuOpen && (
        <div id="mobile-navigation" className="site-mobile-menu">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`site-mobile-link${link.cta ? " site-mobile-cta" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
