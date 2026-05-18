import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const links = [
    { to: "/",       label: "الرئيسية" },
    { to: "/about",  label: "من نحن"   },
    { to: "/donate", label: "تبرع الآن", cta: true },
  ];

  return (
    <>
      <nav style={styles.nav}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>
          💧 <span style={{ color: "#fff" }}>سقيا</span> ماء
        </Link>

        {/* Desktop links */}
        <ul style={styles.links}>
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                style={{
                  ...styles.link,
                  ...(l.cta ? styles.ctaLink : {}),
                  ...(pathname === l.to && !l.cta ? styles.activeLink : {}),
                }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          style={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="القائمة"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={styles.mobileMenu}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

const styles = {
  nav: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    zIndex: 100,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.1rem 2.5rem",
    background: "rgba(10,22,40,0.9)",
    backdropFilter: "blur(14px)",
    borderBottom: "1px solid rgba(0,212,255,0.12)",
  },
  logo: {
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1.45rem",
    fontWeight: 900,
    color: "var(--cyan)",
    textDecoration: "none",
    letterSpacing: "0.5px",
  },
  links: {
    display: "flex",
    gap: "1.8rem",
    listStyle: "none",
    alignItems: "center",
  },
  link: {
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: 500,
    transition: "color 0.3s",
    fontFamily: "'Tajawal', sans-serif",
  },
  activeLink: {
    color: "var(--cyan)",
  },
  ctaLink: {
    background: "linear-gradient(135deg, #1a6fb5, #00d4ff)",
    color: "#fff",
    padding: "0.45rem 1.3rem",
    borderRadius: "50px",
    fontWeight: 700,
    fontSize: "0.92rem",
    fontFamily: "'Cairo', sans-serif",
  },
  hamburger: {
    display: "none",
    background: "transparent",
    border: "none",
    color: "var(--cyan)",
    fontSize: "1.5rem",
    cursor: "pointer",
  },
  mobileMenu: {
    position: "fixed",
    top: "64px", left: 0, right: 0,
    zIndex: 99,
    background: "rgba(10,22,40,0.97)",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem",
    gap: "1rem",
    borderBottom: "1px solid rgba(0,212,255,0.15)",
  },
  mobileLink: {
    color: "var(--white)",
    textDecoration: "none",
    fontSize: "1.1rem",
    fontFamily: "'Cairo', sans-serif",
    fontWeight: 600,
    padding: "0.5rem 0",
    borderBottom: "1px solid rgba(0,212,255,0.08)",
  },
};
