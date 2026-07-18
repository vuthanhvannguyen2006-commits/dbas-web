"use client";
import "@/app/home/global.css";
import MaxWidth from "@/components/max-width/max-width";
import NavBar from "@/components/nav-bar/nav-bar";
import Button from "@/components/button/button";
import Hero from "@/components/hero/hero";
import HoverCard from "@/components/hover-card/hover-card";
import InstagramGrid from "@/components/instagram-grid/instagram-grid";
import Footer from "@/components/footer/footer";

export default function Home() {
  return (
    <div className="page_wrapper">
      {/* Navigation bar*/}
      <NavBar />

      {/* Hero */}
      <Hero/>

      {/* Who we are */}
      <section id = "about" className="about">
        <MaxWidth>
          <div className="about_grid">
            <div className="about_left">
            <h1 className="heading_on_white">
              <span className="heading_accent">Who</span> We Are
            </h1>          
            <h2 className="subtitle_on_white">Empowering Aspiring Business and Analytics Professionals</h2>
              <p className="para_on_white">Deakin Business & Analytics Society is dedicated to supporting Deakin University students
              who have a passion for business and analytics. We offer a dynamic
              environment where members can develop essential skills, engage with
              industry professionals and build lasting relationships. Through
              various networking events, workshops and resources, we prepare our
              members for successful careers in business and analytics.</p>
              <a className="nav_button" href="https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas">
                <Button text="Join Us"/>
              </a>
            </div>
            <div className="about_right">
              <img className="about_img" src="./who-we-are.png"/>
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