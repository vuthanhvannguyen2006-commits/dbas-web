"use client";

import { useEffect, useState } from "react";
import TeamSection, { type TeamMember } from "./team-section";
import { loadTeam } from "@/lib/content";

/* Renders the committed team.json immediately — it is read at build time and
   is already in the HTML — then swaps in live data once the database answers.

   Doing it this way rather than fetching from empty means no flash of missing
   content, no loading state, and the members are still in the page source for
   anything that does not run JavaScript. If the database is unreachable the
   page simply keeps showing what it started with. */
export default function TeamSectionLive({ fallback }: { fallback: TeamMember[] }) {
  const [members, setMembers] = useState<TeamMember[]>(fallback);

  useEffect(() => {
    let cancelled = false;

    loadTeam()
      .then(({ members: live, source }) => {
        // Only replace on a real database answer. A "fallback" result means the
        // loader re-fetched the same JSON we already rendered.
        if (cancelled || source !== "database") return;
        setMembers(live as TeamMember[]);
      })
      .catch((err) => console.warn("Team: keeping the built-in list.", err));

    return () => {
      cancelled = true;
    };
  }, []);

  return <TeamSection members={members} />;
}
