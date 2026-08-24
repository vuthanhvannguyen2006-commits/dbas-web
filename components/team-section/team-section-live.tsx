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
        if (cancelled) return;

        // A "fallback" result means the loader re-fetched the same JSON already
        // rendered, so there is nothing to swap in.
        if (source !== "database") return;

        // An empty answer from a reachable database is not proof the society
        // has no committee — far likelier is everyone accidentally unpublished,
        // or a policy change filtering every row. There is no way to tell the
        // two apart from here, and a blank team section on the live site is the
        // worse mistake, so keep what is already showing.
        if (live.length === 0) {
          console.warn(
            "Team: the database returned no published members; keeping the built-in list. " +
              "If the committee really is empty, this message is expected."
          );
          return;
        }

        setMembers(live as TeamMember[]);
      })
      .catch((err) => console.warn("Team: keeping the built-in list.", err));

    return () => {
      cancelled = true;
    };
  }, []);

  return <TeamSection members={members} />;
}
