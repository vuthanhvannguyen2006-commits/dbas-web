"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa";
import Link from "next/link";

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  tags: string[];
  /* Optional and additive: members imported before this existed simply do not
     have one, and the icon is skipped for them. */
  linkedin?: string | null;
};

export default function TeamSection({ members }: { members: TeamMember[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : members[activeIndex];

  // Close on Escape, navigate with arrow keys while the modal is open.
  useEffect(() => {
    if (activeIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveIndex(null);
      if (e.key === "ArrowRight") setActiveIndex((i) => (i === null ? i : Math.min(i + 1, members.length - 1)));
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeIndex, members.length]);

  return (
    <section className="about-team">
      <div className="about-shell">
        <div>
          <div>
            <h1 className="heading_on_white">
                <span className="heading_accent">MEET</span> THE TEAM
            </h1>
            <h2 className="subtitle_on_white">An executive team run by students, for students</h2>
          </div>
        </div>

        <div className="about-teamGrid">
          {members.map((member, index) => (
            <button
              type="button"
              className="about-memberCard"
              key={member.id}
              onClick={() => setActiveIndex(index)}
              aria-haspopup="dialog"
            >
              <div className="about-memberImage">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                />
                <div className="about-memberOverlay" aria-hidden="true">
                  <span className="about-memberOverlayText">
                    Meet {member.name.split(" ")[0]}
                  </span>
                </div>
              </div>
              <div className="about-memberInfo">
                <div>
                  <h3>{member.name}</h3>
                  <p>{member.role}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div
          className="about-modalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`More about ${active.name}`}
          onClick={() => setActiveIndex(null)}
        >
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="about-modalClose"
              onClick={() => setActiveIndex(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="about-modalMedia">
              <Image
                src={active.image}
                alt={active.name}
                fill
                sizes="(max-width: 900px) 100vw, 40vw"
              />
            </div>

            <div className="about-modalBody">
              <h3>{active.name}</h3>
              <p className="about-modalRole">
                {active.role}
                {active.linkedin && (
                  <a
                    className="about-modalLinkedIn"
                    href={active.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${active.name} on LinkedIn`}
                  >
                    <FaLinkedinIn />
                  </a>
                )}
              </p>
              <p className="about-modalBio">{active.bio}</p>

              <p className="about-modalTagsLabel">Interests</p>
              <div className="about-modalTags">
                {active.tags.map((tag) => (
                  <span className="about-modalTag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="about-modalFooter">
                <button
                  type="button"
                  className="about-modalNavBtn"
                  onClick={() => setActiveIndex((i) => (i === null ? i : Math.max(i - 1, 0)))}
                  disabled={activeIndex === 0}
                >
                  <ChevronLeft size={16} />
                  {activeIndex !== null && activeIndex > 0
                    ? `Meet ${members[activeIndex - 1].name.split(" ")[0]}`
                    : "Meet"}
                </button>

                <button
                  type="button"
                  className="about-modalNavBtn"
                  onClick={() =>
                    setActiveIndex((i) => (i === null ? i : Math.min(i + 1, members.length - 1)))
                  }
                  disabled={activeIndex === members.length - 1}
                >
                  {activeIndex !== null && activeIndex < members.length - 1
                    ? `Meet ${members[activeIndex + 1].name.split(" ")[0]}`
                    : "Meet"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}