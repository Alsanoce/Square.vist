import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const LINKS = [
  { href: "/", label: "الرئيسية", type: "route" },
  { href: "/#current-needs", label: "المشاريع", type: "anchor" },
  { href: "/#water-request-preview", label: "طلب ماء لمسجد", type: "anchor" },
  { href: "/about", label: "عن سانية", type: "route" },
  { href: "/#reports-preview", label: "التقارير", type: "anchor" },
  { href: "/#contact-preview", label: "تواصل معنا", type: "anchor" },
];

const BOTTOM_LINKS = [
  { href: "/", label: "الرئيسية", type: "route" },
  { href: "/#current-needs", label: "المشاريع", type: "anchor" },
  { href: "/donate", label: "تبرع الآن", type: "route", primary: true },
  { href: "/#water-request-preview", label: "طلب ماء", type: "anchor" },
  { href: "/#reports-preview", label: "التقارير", type: "anchor" },
];

function NavItem({ item, className, onClick }) {
  if (item.type === "route") {
    return (
      <Link to={item.href} className={className} onClick={onClick}>
        {item.label}
      </Link>
    );
  }

  return (
    <a href={item.href} className={className} onClick={onClick}>
      {item.label}
    </a>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="site-nav" aria-label="التنقل الرئيسي">
        <Link to="/" className="site-logo" aria-label="سانية، الرئيسية">
          <span className="site-logo-mark" aria-hidden="true" />
          <span className="site-logo-name">سانية</span>
          <span className="site-logo-sub">ماء</span>
        </Link>

        <ul className="site-nav-links">
          {LINKS.map((link) => (
            <li key={link.href + link.label}>
              <NavItem
                item={link}
                className={`site-nav-link${pathname === link.href ? " is-active" : ""}`}
              />
            </li>
          ))}
        </ul>

        <Link to="/donate" className="site-nav-cta">
          تبرع الآن
        </Link>

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
            <NavItem
              key={link.href + link.label}
              item={link}
              className="site-mobile-link"
              onClick={() => setMenuOpen(false)}
            />
          ))}
          <Link to="/donate" className="site-mobile-link site-mobile-cta">
            تبرع الآن
          </Link>
        </div>
      )}

      <nav className="bottom-nav" aria-label="تنقل الموبايل">
        {BOTTOM_LINKS.map((link) => (
          <NavItem
            key={link.href + link.label}
            item={link}
            className={`bottom-nav-link${link.primary ? " bottom-nav-primary" : ""}`}
          />
        ))}
      </nav>
    </>
  );
}
