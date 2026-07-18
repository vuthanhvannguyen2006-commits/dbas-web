"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import MaxWidth from "../max-width/max-width";
import Button from "../button/button";
import styles from "./nav-bar.module.css";


export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMenuOpen(false);
      }
    };
  
    window.addEventListener("resize", handleResize);
  
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  return (
    <nav className="{styles.nav_wrapper}">
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
              <a href="/" className={styles.nav_item}> 
                <span className={styles.nav_text}>
                Home
                </span> 
              </a>
              <a href="/about" className={styles.nav_item}>
                <span className={styles.nav_text}>
                  About Us
                </span> 
              </a>
              <a href="/events" className={styles.nav_item}>
                <span className={styles.nav_text}>
                  Events
                </span> 
              </a>
              <a href="/contact" className={styles.nav_item}>
                <span className={styles.nav_text}>
                  Contact
                </span> 
              </a>
          </ul>  
          {/* "Join Us" button */}
          <a className={styles.nav_button} href="https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas">
                <Button text="Join Us"/>
          </a>

          {/* Mobile hamburger menu */}
          <div
            className={`${styles.hamburger} ${menuOpen ? styles.active : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className={styles.hamburger_bar}></div>
            <div className={styles.hamburger_bar}></div>
            <div className={styles.hamburger_bar}></div>


            
          </div>
          
          {/* Side hamburger menu*/}
          <ul
            className={`${styles.hamburger_menu} ${
            menuOpen ? styles.menu_open : ""
            }`}
          >
              <Link href="/" className={styles.hamburger_logo}>
                <img src="/dbas-logo.png" alt="DBAS Logo"/>
              </Link>
              <li><Link href="/" className={styles.hamburger_link}>Home</Link></li>
              <li><Link href="/about" className={styles.hamburger_link}>About Us</Link></li>
              <li><Link href="/events" className={styles.hamburger_link}>Events</Link></li>
              <li><Link href="/contact" className={styles.hamburger_link}>Contact</Link></li>
              <a className="nav_button" href="https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas">
                <Button text="Join Us"/>
              </a>
          </ul>




        </div>
      </MaxWidth>
    </nav>
  );
}