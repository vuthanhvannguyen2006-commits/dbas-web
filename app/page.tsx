"use client";
import "@/app/home/global.css";
import MaxWidth from "@/components/max-width/max-width";
import NavBar from "@/components/nav-bar/nav-bar";
import Button from "@/components/button/button";
import Hero from "@/components/hero/hero";
import HoverCard from "@/components/hover-card/hover-card";
import InstagramGrid from "@/components/instagram-grid/instagram-grid";
import Footer from "@/components/footer/footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="page_wrapper">
      {/* Navigation bar*/}
      <NavBar />

      {/* Hero */}
      <Hero/>

      {/* Why join DBAS */}
      <section id = "about" className="about">
        <MaxWidth>
          <div className="about_grid">
            <div className="about_left">
            <h1 className="heading_on_white">
              Why <span className="heading_accent">DBAS?</span>
            </h1>
            <h2 className="subtitle_on_white">Find your people. Build your future.</h2>
              <p className="para_on_white">
                University is more than lectures. DBAS gives you a place to meet
                ambitious students, learn from industry and turn your interests into
                practical experience.
              </p>
              <div className="about_benefits" aria-label="DBAS membership benefits">
                <div className="about_benefit">
                  <span>01</span>
                  <div><strong>Industry access</strong><small>Meet professionals and explore career pathways.</small></div>
                </div>
                <div className="about_benefit">
                  <span>02</span>
                  <div><strong>Practical skills</strong><small>Learn by doing through workshops and projects.</small></div>
                </div>
                <div className="about_benefit">
                  <span>03</span>
                  <div><strong>Real community</strong><small>Build friendships that continue beyond university.</small></div>
                </div>
              </div>
              <Link className="nav_button" href="/about">
                <Button text="Discover DBAS"/>
              </Link>
            </div>
            <div className="about_right">
              <img
                className="about_img"
                src="/social.jpeg"
                alt="DBAS students together at a society event"
              />
              <div className="about_photoLabel">
                <strong>Built by students</strong>
                <span>For students</span>
              </div>
            </div>
          </div>
        </MaxWidth>
      </section>
    
      {/* What we do */}
      <section className="activities">
        <HoverCard />
      </section>

      {/* Instagram Grid */}
      <section className="instagram_grid">
        <InstagramGrid />
      </section>

      {/* Ending: Join Us Now*/}
      <section className="ending_join">
        <MaxWidth>
          <div className="ending_join_overlay" />
          <div className="ending_join_content">
            <div className="ending_join_text">
              <img className="ending_logo" src="./dbas-logo.png" />
              <h1 className="heading_on_black">
                JOIN US <span className="heading_accent">NOW</span>
              </h1>
              <p>
                Sign up via DUSA to become a DBAS member and unlock a year of events,
                networking, competitions and career opportunities.
              </p>
            </div>
            <div className="ending_join_buttons">
              <a
              className="nav_button"
              href="https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas">
                <Button text="Join via DUSA" />
              </a>
              <a
                className="nav_button"
                href="https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas">
                <Button text="Send Us an Email" />
              </a>
            </div>
          </div>
        </MaxWidth>
      </section>

      {/*Footer*/}
      <section className="footer">
        <Footer/>
      </section>
    </div>




  );
}
