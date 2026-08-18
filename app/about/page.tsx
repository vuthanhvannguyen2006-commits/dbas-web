import "@/app/about/global.css";
import fs from "fs";
import path from "path";
import Image from "next/image";
import { ArrowRight, BarChart3, BriefcaseBusiness, Network, Target } from "lucide-react";
import NavBar from "@/components/nav-bar/nav-bar";
import Footer from "@/components/footer/footer";
import { type TeamMember } from "@/components/team-section/team-section";
import TeamSectionLive from "@/components/team-section/team-section-live";

const joinUrl =
  "https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas";

const pillars = [
  {
    icon: BarChart3,
    title: "Professional Growth",
    copy: "Build practical skills through expert-led workshops, seminars and hands-on learning.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Industry Connections",
    copy: "Meet leaders and professionals across the business, data and analytics sectors.",
  },
  {
    icon: Network,
    title: "A Strong Community",
    copy: "Find your people, share ideas and build relationships that last beyond university.",
  },
  {
    icon: Target,
    title: "Our Vision",
    copy: "Become Deakin's leading student community for business and analytics professionals.",
  },
];

// Read at build time and used as the starting content, so the page is never
// blank while the database is being queried and the members are present in the
// HTML. The live list replaces it client-side. The weekly job in Phase 8 keeps
// this file in step with the database so it never drifts far.
function getTeamMembers(): TeamMember[] {
  const filePath = path.join(process.cwd(), "public", "data", "team.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export default function AboutPage() {
  const team = getTeamMembers();

  return (
    <main className="about-page">
      <NavBar />

      <section className="about-hero">
        <div className="about-heroGlow" aria-hidden="true" />
        <div className="about-shell">
          <div className="about-heroGrid">
            <div className="about-heroCopy">
              <h1>
                About <span>Us</span>
              </h1>
              <p className="about-lead">
                We are a student-led community at Deakin University committed to fostering the next
                generation of business and analytics leaders.
              </p>
              <a className="about-primaryButton" href={joinUrl}>
                Join our community <ArrowRight size={18} />
              </a>
            </div>

            <div className="about-heroImageWrap">
              <Image
                className="about-heroImage"
                src="/dbas-logo.png"
                alt="Deakin Business and Analytics Society logo"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 55vw"
              />
              <div className="about-heroLogoCaption">
                <span>Deakin Business &amp; Analytics Society</span>
                <small>Established 2022</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-story">
        <div className="about-shell about-storyGrid">
          <div>
            <h1 className="heading_on_white">
              <span className="heading_accent">WHO</span> WE ARE
            </h1>
            <h2 className="subtitle_on_white">Empowering Aspiring Business and Analytics Professionals</h2>
            <p>
              Deakin Business & Analytics Society is dedicated to supporting
              Deakin University students who have a passion for business and
              analytics. We offer a dynamic platform where members can develop
              essential skills, engage with industry professionals and build
              lasting relationships.
            </p>
            <p>
              Through networking events, workshops and practical resources, we
              prepare our members for successful careers in business and
              analytics.
            </p>
            <a className="about-textLink" href={joinUrl}>
              Become a member <ArrowRight size={17} />
            </a>
          </div>

          <div className="about-storyImage">
            <Image
              src="/who-we-are.png"
              alt="DBAS members collaborating at a networking event"
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
            />
            <div className="about-imageAccent" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="about-mission">
        <div className="about-shell">
          <div>
            <div>
              <h1 className="heading_on_black">
                OUR <span className="heading_accent">MISSION & VISION</span>
              </h1>
              <h2 className="subtitle_on_black">Helping students turn Business and Analytics interests into opportunity</h2>
            </div>
            <p>
              Our teams work to create an open environment for members to expand their professional network and gain relevant industry insights, preparing for a career in Business and Analytics.
            </p>
            <br></br>
          </div>

          <div className="about-pillarGrid">
            {pillars.map(({ icon: Icon, title, copy }) => (
              <article className="about-pillarCard" key={title}>
                <div className="about-iconBox">
                  <Icon size={25} strokeWidth={1.8} />
                </div>
                <h2 className="subtitle_on_black">{title}</h2>
                <p>{copy}</p>
              </article>
            ))}
          </div>

        </div>
      </section>

      {/* The build-time list renders first, then live data replaces it once
          the database answers. See team-section-live.tsx. */}
      <TeamSectionLive fallback={team} />

      <section className="about-cta">
        <div className="about-shell">
          <div className="about-ctaInner">
            <div>
              <p className="about-sectionLabel">Ready to get involved?</p>
              <h2>Your next opportunity starts here.</h2>
            </div>
            <a className="about-primaryButton" href={joinUrl}>
              Join DBAS <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
