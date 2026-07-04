import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Network,
  Target,
} from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa";
import NavBar from "@/components/nav-bar/nav-bar";
import Footer from "@/components/footer/footer";
import styles from "./about.module.css";

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
];

const team = [
  {
    name: "Stephen Harris",
    role: "President",
    image: "/hero-1.png",
  },
  {
    name: "Rachel Nguyen",
    role: "Vice President",
    image: "/hero-2.png",
  },
  {
    name: "James Patel",
    role: "Events & Operations",
    image: "/hero-3.png",
  },
];

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <NavBar />

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                Deakin Business & Analytics Society
              </p>
              <h1>
                About <span>Us</span>
              </h1>
              <h2>Your gateway to success</h2>
              <p className={styles.lead}>
                We are a student-led community committed to fostering the next
                generation of business and analytics leaders.
              </p>
              <a className={styles.primaryButton} href={joinUrl}>
                Join our community <ArrowRight size={18} />
              </a>
            </div>

            <div className={styles.heroImageWrap}>
              <Image
                className={styles.heroImage}
                src="/about-img.png"
                alt="DBAS members connecting at a professional event"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 55vw"
              />
              <div className={styles.statCard}>
                <strong>Learn. Connect. Grow.</strong>
                <span>Opportunities built for Deakin students</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.story}>
        <div className={`${styles.shell} ${styles.storyGrid}`}>
          <div className={styles.storyCopy}>
            <p className={styles.sectionLabel}>Who we are</p>
            <h2>Empowering aspiring business professionals</h2>
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
            <a className={styles.textLink} href={joinUrl}>
              Become a member <ArrowRight size={17} />
            </a>
          </div>

          <div className={styles.storyImage}>
            <Image
              src="/hero-3.png"
              alt="DBAS members collaborating at a networking event"
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
            />
            <div className={styles.imageAccent} aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className={styles.mission}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Our mission &amp; vision</p>
              <h2>Helping students turn ambition into opportunity</h2>
            </div>
            <p>
              Our team is here to support members at every step—from their first
              campus event to their first role in industry.
            </p>
          </div>

          <div className={styles.pillarGrid}>
            {pillars.map(({ icon: Icon, title, copy }) => (
              <article className={styles.pillarCard} key={title}>
                <div className={styles.iconBox}>
                  <Icon size={25} strokeWidth={1.8} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>

          <div className={styles.visionStrip}>
            <Target size={32} strokeWidth={1.5} />
            <p>
              <strong>Our vision</strong>
              To be Deakin’s leading student community for future-focused
              business and analytics professionals.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.team}>
        <div className={styles.shell}>
          <div className={styles.teamHeading}>
            <div>
              <p className={styles.sectionLabel}>Meet the team</p>
              <h2>Students building something meaningful</h2>
            </div>
            <Link className={styles.textLink} href="/contact">
              Get in touch <ArrowRight size={17} />
            </Link>
          </div>

          <div className={styles.teamGrid}>
            {team.map((member) => (
              <article className={styles.memberCard} key={member.name}>
                <div className={styles.memberImage}>
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                  />
                </div>
                <div className={styles.memberInfo}>
                  <div>
                    <h3>{member.name}</h3>
                    <p>{member.role}</p>
                  </div>
                  <a
                    href="https://www.linkedin.com/company/deakinbas/"
                    aria-label={`${member.name} on LinkedIn`}
                  >
                    <FaLinkedinIn size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.shell}>
          <div className={styles.ctaInner}>
            <div>
              <p className={styles.sectionLabel}>Ready to get involved?</p>
              <h2>Your next opportunity starts here.</h2>
            </div>
            <a className={styles.primaryButton} href={joinUrl}>
              Join DBAS <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
