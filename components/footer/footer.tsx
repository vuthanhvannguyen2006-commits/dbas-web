"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./footer.module.css";
import MaxWidth from "../max-width/max-width";


export default function Footer() {
  return (
      <footer className={styles.footer}>
        <MaxWidth>
          
          <div className={styles.footer_inner}>

            {/* Logo + Social media */}
            <div className={styles.logo_section}>
              <Image
                className={styles.footer_logo}
                src="/dbas-logo.png"
                alt="DBAS Logo"
                width={120}
                height={120}
              />
              <div className={styles.socials}>
                <p> FOLLOW US</p>
                <div className={styles.social_links}>
                  <a href="https://www.instagram.com/deakinbas/"
                    className={styles.social_icon}
                    aria-label="Instagram"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                      <path fill="currentColor" d="M10.202,2.098c-1.49,.07-2.507,.308-3.396,.657-.92,.359-1.7,.84-2.477,1.619-.776,.779-1.254,1.56-1.61,2.481-.345,.891-.578,1.909-.644,3.4-.066,1.49-.08,1.97-.073,5.771s.024,4.278,.096,5.772c.071,1.489,.308,2.506,.657,3.396,.359,.92,.84,1.7,1.619,2.477,.779,.776,1.559,1.253,2.483,1.61,.89,.344,1.909,.579,3.399,.644,1.49,.065,1.97,.08,5.771,.073,3.801-.007,4.279-.024,5.773-.095s2.505-.309,3.395-.657c.92-.36,1.701-.84,2.477-1.62s1.254-1.561,1.609-2.483c.345-.89,.579-1.909,.644-3.398,.065-1.494,.081-1.971,.073-5.773s-.024-4.278-.095-5.771-.308-2.507-.657-3.397c-.36-.92-.84-1.7-1.619-2.477s-1.561-1.254-2.483-1.609c-.891-.345-1.909-.58-3.399-.644s-1.97-.081-5.772-.074-4.278,.024-5.771,.096m.164,25.309c-1.365-.059-2.106-.286-2.6-.476-.654-.252-1.12-.557-1.612-1.044s-.795-.955-1.05-1.608c-.192-.494-.423-1.234-.487-2.599-.069-1.475-.084-1.918-.092-5.656s.006-4.18,.071-5.656c.058-1.364,.286-2.106,.476-2.6,.252-.655,.556-1.12,1.044-1.612s.955-.795,1.608-1.05c.493-.193,1.234-.422,2.598-.487,1.476-.07,1.919-.084,5.656-.092,3.737-.008,4.181,.006,5.658,.071,1.364,.059,2.106,.285,2.599,.476,.654,.252,1.12,.555,1.612,1.044s.795,.954,1.051,1.609c.193,.492,.422,1.232,.486,2.597,.07,1.476,.086,1.919,.093,5.656,.007,3.737-.006,4.181-.071,5.656-.06,1.365-.286,2.106-.476,2.601-.252,.654-.556,1.12-1.045,1.612s-.955,.795-1.608,1.05c-.493,.192-1.234,.422-2.597,.487-1.476,.069-1.919,.084-5.657,.092s-4.18-.007-5.656-.071M21.779,8.517c.002,.928,.755,1.679,1.683,1.677s1.679-.755,1.677-1.683c-.002-.928-.755-1.679-1.683-1.677,0,0,0,0,0,0-.928,.002-1.678,.755-1.677,1.683m-12.967,7.496c.008,3.97,3.232,7.182,7.202,7.174s7.183-3.232,7.176-7.202c-.008-3.97-3.233-7.183-7.203-7.175s-7.182,3.233-7.174,7.203m2.522-.005c-.005-2.577,2.08-4.671,4.658-4.676,2.577-.005,4.671,2.08,4.676,4.658,.005,2.577-2.08,4.671-4.658,4.676-2.577,.005-4.671-2.079-4.676-4.656h0"></path>
                    </svg>
                  </a>
                  <a href="https://www.linkedin.com/company/deakinbas/?originalSubdomain=au"
                    className={styles.social_icon}
                    aria-label="LinkedIn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                      <path fill="currentColor" d="M26.111,3H5.889c-1.595,0-2.889,1.293-2.889,2.889V26.111c0,1.595,1.293,2.889,2.889,2.889H26.111c1.595,0,2.889-1.293,2.889-2.889V5.889c0-1.595-1.293-2.889-2.889-2.889ZM10.861,25.389h-3.877V12.87h3.877v12.519Zm-1.957-14.158c-1.267,0-2.293-1.034-2.293-2.31s1.026-2.31,2.293-2.31,2.292,1.034,2.292,2.31-1.026,2.31-2.292,2.31Zm16.485,14.158h-3.858v-6.571c0-1.802-.685-2.809-2.111-2.809-1.551,0-2.362,1.048-2.362,2.809v6.571h-3.718V12.87h3.718v1.686s1.118-2.069,3.775-2.069,4.556,1.621,4.556,4.975v7.926Z" fillRule="evenodd"></path>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Navigation + Contact*/}
            <div className={styles.footer_main}>
              {/*Navigation menu*/}
              <ul className={styles.links_container}>
                  <li><h1> MENU </h1></li>
                  <li><Link className={styles.nav_item} href="/">
                    <h4 className={styles.nav_text}>Home</h4>
                  </Link></li>
                  <li><Link className={styles.nav_item} href="/about">
                    <h4 className={styles.nav_text}>About</h4>
                  </Link></li>
                  <li><Link className={styles.nav_item} href="/events">
                    <h4 className={styles.nav_text}>Events</h4>
                  </Link></li>
                  <li><Link className={styles.nav_item} href="/contact">
                    <h4 className={styles.nav_text}>Contact</h4>
                  </Link></li>
                  <li><Link className={styles.nav_item} href="/faq">
                    <h4 className={styles.nav_text}>FAQ</h4>
                  </Link></li>
              </ul>
              {/*Contact Details*/}
              <div className={styles.footer_contact}>
                <h1>CONTACT US</h1>
                <div >
                  <a href="mailto:dbasdeakin@gmail.com"
                    className={styles.contact_line}
                    aria-label="Mail"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className={styles.contact_icon}>
                      <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="122.88px" height="78.607px" viewBox="0 0 122.88 78.607" enableBackground="new 0 0 122.88 78.607">
                        <path fill="currentColor" d="M61.058,65.992l24.224-24.221l36.837,36.836H73.673h-25.23H0l36.836-36.836 L61.058,65.992L61.058,65.992z M1.401,0l59.656,59.654L120.714,0H1.401L1.401,0z M0,69.673l31.625-31.628L0,6.42V69.673L0,69.673z M122.88,72.698L88.227,38.045L122.88,3.393V72.698L122.88,72.698z" fillRule="evenodd" clipRule="evenodd" ></path>
                      </svg>
                    </div>
                    <p>dbasdeakin@gmail.com</p>
                  </a>

                  <a href="https://www.google.com/maps/place/Deakin+University+Melbourne+Burwood+Campus/@-37.8474642,145.1121074,687m/data=!3m2!1e3!4b1!4m6!3m5!1s0x6ad640592c2ddceb:0x805bd52f251bd12!8m2!3d-37.8474685!4d145.1146823!16s%2Fm%2F0ct37kb?entry=ttu&g_ep=EgoyMDI2MDYyMS4wIKXMDSoASAFQAw%3D%3D"
                    className={styles.contact_line}
                    aria-label="Map"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className={styles.contact_icon}>
                      <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 92.25 122.88">
                        <path fill="currentColor" d="M68.51,106.28c-5.59,6.13-12.1,11.62-19.41,16.06c-0.9,0.66-2.12,0.74-3.12,0.1 c-10.8-6.87-19.87-15.12-27-24.09C9.14,86.01,2.95,72.33,0.83,59.15c-2.16-13.36-0.14-26.22,6.51-36.67 c2.62-4.13,5.97-7.89,10.05-11.14C26.77,3.87,37.48-0.08,48.16,0c10.28,0.08,20.43,3.91,29.2,11.92c3.08,2.8,5.67,6.01,7.79,9.49 c7.15,11.78,8.69,26.8,5.55,42.02c-3.1,15.04-10.8,30.32-22.19,42.82V106.28L68.51,106.28z M46.12,23.76 c12.68,0,22.95,10.28,22.95,22.95c0,12.68-10.28,22.95-22.95,22.95c-12.68,0-22.95-10.27-22.95-22.95 C23.16,34.03,33.44,23.76,46.12,23.76L46.12,23.76z" fillRule="evenodd" clipRule="evenodd" />
                      </svg>  
                    </div>                
                    <p>Deakin University Burwood Campus, VIC 3125, Australia </p>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className={styles.copyright}>
            <small>
              © 2026 Deakin Business and Analytics Society. All Rights Reserved
            </small>
          </div>
        </MaxWidth>
    </footer> 
    
  );
}
