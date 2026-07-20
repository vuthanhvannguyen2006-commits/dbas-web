"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import MaxWidth from "../max-width/max-width";
import Button from "../button/button";
import styles from "./nav-bar.module.css";


export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMenuOpen(false);
      }
    };
  
    window.addEventListener("resize", handleResize);
  
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    const handleOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuOpen &&
        !menuRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handleOutsideTap, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("pointerdown", handleOutsideTap, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  
  return (
    <>
    <div className={styles.nav_spacer} aria-hidden="true" />
    <nav className={styles.nav_wrapper}>
      <MaxWidth>
        <div className={styles.navbar}>

          {/* Logo and brand name */}
          <Link href="/" className={styles.brand}>
            <img src="/dbas-logo.png" alt="DBAS Logo"/>
            <div className={styles.brand_name}>
              <h3>DBAS</h3>
              <p>Deakin Business & Analytics Society</p>
            </div>
          </Link>

          {/* Desktop navigation menu */}
          <ul className={styles.nav_menu}>
            <li><Link href="/" className={styles.nav_item}>
                <span className={styles.nav_text}>
                Home
                </span> 
            </Link></li>
            <li><Link href="/about" className={styles.nav_item}>
                <span className={styles.nav_text}>
                  About Us
                </span> 
            </Link></li>
            <li><Link href="/events" className={styles.nav_item}>
                <span className={styles.nav_text}>
                  Events
                </span> 
            </Link></li>
          </ul>  
          {/* "Join Us" button */}
          <a className={styles.nav_button} href="https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas">
                <Button text="Join Us"/>
          </a>

          {/* Mobile hamburger menu */}
          <button
            ref={menuButtonRef}
            type="button"
            className={`${styles.hamburger} ${menuOpen ? styles.active : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            <div className={styles.hamburger_bar}></div>
            <div className={styles.hamburger_bar}></div>
            <div className={styles.hamburger_bar}></div>
          </button>

          {menuOpen && (
            <div
              className={styles.menuBackdrop}
              aria-hidden="true"
            />
          )}
          
          {/* Side hamburger menu*/}
          <ul
            ref={menuRef}
            id="mobile-navigation"
            className={`${styles.hamburger_menu} ${
            menuOpen ? styles.menu_open : ""
            }`}
          >
              <li className={styles.mobileLogoItem}><Link href="/" className={styles.hamburger_logo} onClick={closeMenu}>
                <img src="/dbas-logo.png" alt="DBAS Logo"/>
              </Link></li>
              <li><Link href="/" className={styles.hamburger_link} onClick={closeMenu}>Home</Link></li>
              <li><Link href="/about" className={styles.hamburger_link} onClick={closeMenu}>About Us</Link></li>
              <li><Link href="/events" className={styles.hamburger_link} onClick={closeMenu}>Events</Link></li>
              <li><Link href="/contact" className={styles.hamburger_link} onClick={closeMenu}>Contact</Link></li>
              <li className={styles.mobileJoinItem}><a className={styles.mobileJoin} href="https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas">
                <Button text="Join Us"/>
              </a></li>
          </ul>




        </div>
      </MaxWidth>
    </nav>
    </>
  );
}
