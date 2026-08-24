export type EventRow = {
  id: string;
  slug: string;
  title: string;
  tag: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  image_url: string | null;
  cta: string | null;
  link: string | null;
  is_featured: boolean;
  is_published: boolean;
};

export type TeamMemberRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  image_url: string | null;
  bio: string | null;
  tags: string[];
  linkedin_url: string | null;
  sort_order: number;
  is_published: boolean;
};

/** Matches the tags already used in public/data/events.json, plus room to grow.
    Kept as a plain list rather than a database constraint so the committee can
    add one without a migration. */
export const EVENT_TAGS = [
  "Social",
  "Workshop",
  "Seminar",
  "Competition",
  "Networking",
  "Other",
] as const;
