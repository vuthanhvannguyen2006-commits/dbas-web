/*
 * Past committees as constellations in the Hall of Memories.
 *
 * Each cohort year gets one real constellation from a fixed queue indexed by
 * (year - 2026), so a year's sky never changes when other years are added or
 * backfilled, and no constellation repeats. Star positions are stored as
 * catalogue values (J2000 right ascension in decimal hours, declination in
 * decimal degrees) and projected here, so they can be checked against any
 * star catalogue.
 * Position references: IAU Naming Stars catalogue (18 named stars), mirrored
 * at https://www.ursa.fi/ursa/jaostot/pikkuplan/tahdenpeitot/2022/tahdet/Naming%20Stars%20_%20IAU.html
 * Remaining figure coordinates: CDS SIMBAD, zet02 Sco, eta Sco, iot01 Sco,
 * kap Sco. Orion figure positions: https://preprod.skyserver.sdss.org/dr13/en/proj/games/constellation/orion.aspx
 *
 * Kept free of path aliases, enums and JSX so node --experimental-strip-types
 * can import it from the tests.
 */

export type CatalogueStar = {
  id: string;
  /** Proper name, or the Bayer designation for unnamed figure stars. */
  name: string;
  designation: string;
  /** Right ascension, J2000, decimal hours. */
  ra: number;
  /** Declination, J2000, decimal degrees. */
  dec: number;
  /** Apparent visual magnitude (approximate for variable stars). */
  mag: number;
  /** Written about the star itself so it stays true whoever holds it. */
  meaning: string;
};

export type Constellation = {
  id: string;
  name: string;
  /** One line about the constellation. Absent for reserved entries. */
  meaning?: string;
  /** Named stars, in member assignment order. Absent for reserved entries. */
  stars?: CatalogueStar[];
  /** Unnamed stars drawn only to complete the traditional figure. */
  figureOnly?: CatalogueStar[];
  /** Traditional figure, as pairs of star ids. */
  lines?: [string, string][];
};

const ORION: Constellation = {
  id: "orion",
  name: "Orion",
  meaning:
    "Eight stars in Orion honour the people who shaped DBAS in 2026, connected by the year they shared.",
  stars: [
    {
      id: "rigel",
      name: "Rigel",
      designation: "β Orionis",
      ra: 5.2423,
      dec: -8.2017,
      mag: 0.13,
      meaning:
        "Rigel is the blue-white star marking one of Orion's feet. Here, in our southern-sky view, it shines near the top of the figure.",
    },
    {
      id: "betelgeuse",
      name: "Betelgeuse",
      designation: "α Orionis",
      ra: 5.9195,
      dec: 7.4071,
      mag: 0.5,
      meaning:
        "The red star marking one of Orion's shoulders, opposite Bellatrix across the figure.",
    },
    {
      id: "meissa",
      name: "Meissa",
      designation: "λ Orionis",
      ra: 5.5856,
      dec: 9.9342,
      mag: 3.39,
      meaning:
        "Meissa marks Orion's head, joining the two shoulders in a small triangle.",
    },
    {
      id: "alnilam",
      name: "Alnilam",
      designation: "ε Orionis",
      ra: 5.6036,
      dec: -1.2019,
      mag: 1.69,
      meaning:
        "Alnilam is the middle star of Orion's Belt, connecting Mintaka and Alnitak.",
    },
    {
      id: "mintaka",
      name: "Mintaka",
      designation: "δ Orionis",
      ra: 5.5334,
      dec: -0.2991,
      mag: 2.23,
      meaning:
        "Mintaka marks the western end of Orion's Belt, close to the celestial equator.",
    },
    {
      id: "alnitak",
      name: "Alnitak",
      designation: "ζ Orionis",
      ra: 5.6793,
      dec: -1.9426,
      mag: 1.77,
      meaning:
        "Alnitak marks the eastern end of Orion's Belt, completing its familiar line of three stars.",
    },
    {
      id: "bellatrix",
      name: "Bellatrix",
      designation: "γ Orionis",
      ra: 5.4189,
      dec: 6.3497,
      mag: 1.64,
      meaning:
        "Bellatrix marks Orion's other shoulder, balancing Betelgeuse across the constellation.",
    },
    {
      id: "saiph",
      name: "Saiph",
      designation: "κ Orionis",
      ra: 5.7959,
      dec: -9.6696,
      mag: 2.06,
      meaning:
        "Saiph marks Orion's other foot, opposite Rigel at the base of the traditional figure.",
    },
  ],
  lines: [
    ["meissa", "betelgeuse"],
    ["meissa", "bellatrix"],
    ["betelgeuse", "alnitak"],
    ["bellatrix", "mintaka"],
    ["mintaka", "alnilam"],
    ["alnilam", "alnitak"],
    ["alnitak", "saiph"],
    ["mintaka", "rigel"],
  ],
};

const SCORPIUS: Constellation = {
  id: "scorpius",
  name: "Scorpius",
  meaning:
    "One of the few constellations that looks like its name. From Melbourne it passes almost overhead on winter evenings.",
  stars: [
    {
      id: "antares",
      name: "Antares",
      designation: "α Scorpii",
      ra: 16.4901,
      dec: -26.432,
      mag: 1.06,
      meaning:
        "Antares marks the heart of Scorpius, between Alniyat and Paikauhale in the figure.",
    },
    {
      id: "shaula",
      name: "Shaula",
      designation: "λ Scorpii",
      ra: 17.5601,
      dec: -37.1038,
      mag: 1.62,
      meaning: "Shaula marks the sting at the end of Scorpius's curling tail.",
    },
    {
      id: "acrab",
      name: "Acrab",
      designation: "β¹ Scorpii",
      ra: 16.0906,
      dec: -19.8055,
      mag: 2.62,
      meaning: "Acrab is one of the stars marking the head of Scorpius.",
    },
    {
      id: "dschubba",
      name: "Dschubba",
      designation: "δ Scorpii",
      ra: 16.0056,
      dec: -22.6217,
      mag: 2.29,
      meaning: "Dschubba sits between Acrab and Fang at the head of Scorpius.",
    },
    {
      id: "sargas",
      name: "Sargas",
      designation: "θ Scorpii",
      ra: 17.622,
      dec: -42.9978,
      mag: 1.86,
      meaning:
        "Sargas marks a turn in the tail as it curves towards the sting.",
    },
    {
      id: "larawag",
      name: "Larawag",
      designation: "ε Scorpii",
      ra: 16.8361,
      dec: -34.2932,
      mag: 2.29,
      meaning:
        "Larawag sits along the scorpion's body, between its heart and the curve of its tail.",
    },
    {
      id: "alniyat",
      name: "Alniyat",
      designation: "σ Scorpii",
      ra: 16.3531,
      dec: -25.5928,
      mag: 2.88,
      meaning:
        "Alniyat sits beside Antares, connecting the head to the heart in this figure.",
    },
    {
      id: "fang",
      name: "Fang",
      designation: "π Scorpii",
      ra: 15.9809,
      dec: -26.1141,
      mag: 2.89,
      meaning: "Fang completes the three-star arc at the head of Scorpius.",
    },
    {
      id: "girtab",
      name: "Girtab",
      designation: "κ Scorpii",
      ra: 17.7081,
      dec: -39.03,
      mag: 2.39,
      meaning:
        "Kappa Scorpii, traditionally called Girtab, lies near the end of the tail, beside Shaula in the figure.",
    },
    {
      id: "paikauhale",
      name: "Paikauhale",
      designation: "τ Scorpii",
      ra: 16.5981,
      dec: -28.2161,
      mag: 2.82,
      meaning:
        "Paikauhale sits beside Antares on the way from the heart towards the tail.",
    },
    {
      id: "xamidimura",
      name: "Xamidimura",
      designation: "μ¹ Scorpii",
      ra: 16.8645,
      dec: -38.0475,
      mag: 3.0,
      meaning:
        "Xamidimura lies along the tail, between Larawag and its southern curve.",
    },
  ],
  figureOnly: [
    {
      id: "zeta2-sco",
      name: "ζ² Scorpii",
      designation: "ζ² Scorpii",
      ra: 16.9097,
      dec: -42.3614,
      mag: 3.62,
      meaning: "",
    },
    {
      id: "eta-sco",
      name: "η Scorpii",
      designation: "η Scorpii",
      ra: 17.2026,
      dec: -43.2392,
      mag: 3.33,
      meaning: "",
    },
    {
      id: "iota1-sco",
      name: "ι¹ Scorpii",
      designation: "ι¹ Scorpii",
      ra: 17.7931,
      dec: -40.1269,
      mag: 2.99,
      meaning: "",
    },
  ],
  lines: [
    ["acrab", "dschubba"],
    ["dschubba", "fang"],
    ["dschubba", "alniyat"],
    ["alniyat", "antares"],
    ["antares", "paikauhale"],
    ["paikauhale", "larawag"],
    ["larawag", "xamidimura"],
    ["xamidimura", "zeta2-sco"],
    ["zeta2-sco", "eta-sco"],
    ["eta-sco", "sargas"],
    ["sargas", "iota1-sco"],
    ["iota1-sco", "girtab"],
    ["girtab", "shaula"],
  ],
};

/** Reserved queue entries: names only until their star data is written. */
const reserved = (id: string, name: string): Constellation => ({ id, name });

export const CONSTELLATIONS: Record<string, Constellation> = {
  orion: ORION,
  scorpius: SCORPIUS,
  leo: reserved("leo", "Leo"),
  crux: reserved("crux", "Crux"),
  gemini: reserved("gemini", "Gemini"),
  sagittarius: reserved("sagittarius", "Sagittarius"),
  pegasus: reserved("pegasus", "Pegasus"),
  "canis-major": reserved("canis-major", "Canis Major"),
  taurus: reserved("taurus", "Taurus"),
};

export const FIRST_CONSTELLATION_YEAR = 2026;

/** Index = year - FIRST_CONSTELLATION_YEAR. Append only; never reorder. */
export const CONSTELLATION_QUEUE: readonly string[] = [
  "orion",
  "scorpius",
  "leo",
  "crux",
  "gemini",
  "sagittarius",
  "pegasus",
  "canis-major",
  "taurus",
];

export function constellationForYear(year: number): Constellation | null {
  if (!Number.isInteger(year)) return null;
  const id = CONSTELLATION_QUEUE[year - FIRST_CONSTELLATION_YEAR];
  return id ? (CONSTELLATIONS[id] ?? null) : null;
}

export type ChartedConstellation = Constellation & {
  meaning: string;
  stars: CatalogueStar[];
  lines: [string, string][];
};

export function hasStarData(
  c: Constellation | null | undefined,
): c is ChartedConstellation {
  return Boolean(c?.meaning && c.stars?.length && c.lines?.length);
}

/** The last four-digit year from 2000 to 2099 in free text, or null. */
export function cohortYear(text: string | null | undefined): number | null {
  if (!text) return null;
  let year: number | null = null;
  for (const match of text.matchAll(/(?:^|\D)(20\d{2})(?=\D|$)/g)) {
    year = Number(match[1]);
  }
  return year;
}

/* ---------- Cohort grouping ---------- */

export type CohortMember = {
  id: string;
  sort_order: number;
  created_at: string;
  years_active: string | null;
};

export type Cohort<T> = {
  year: number;
  constellation: ChartedConstellation;
  members: T[];
};

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function compareMembers(a: CohortMember, b: CohortMember): number {
  return (
    a.sort_order - b.sort_order ||
    compareText(a.created_at, b.created_at) ||
    compareText(a.id, b.id)
  );
}

/**
 * Splits members into constellation cohorts (newest year first) and everyone
 * else: no parseable year, a year before 2026, or a year whose constellation
 * has no star data yet.
 */
export function groupCohorts<T extends CohortMember>(
  members: readonly T[],
): { cohorts: Cohort<T>[]; others: T[] } {
  const byYear = new Map<number, Cohort<T>>();
  const others: T[] = [];
  for (const member of members) {
    const year = cohortYear(member.years_active);
    const constellation = year === null ? null : constellationForYear(year);
    if (year === null || !hasStarData(constellation)) {
      others.push(member);
      continue;
    }
    const cohort = byYear.get(year) ?? { year, constellation, members: [] };
    cohort.members.push(member);
    byYear.set(year, cohort);
  }
  const cohorts = [...byYear.values()].sort((a, b) => b.year - a.year);
  for (const cohort of cohorts) {
    cohort.members.sort(compareMembers);
    // Dense cohorts remain fully accessible in the accompanying card grid.
    // Do not crowd hundreds of tap targets into a single sky.
    others.push(...cohort.members.splice(24));
  }
  return { cohorts, others: others.sort(compareMembers) };
}

/* ---------- Projection ---------- */

export type SkyStar = {
  id: string;
  name: string;
  designation: string | null;
  meaning: string;
  x: number;
  y: number;
  r: number;
  /** named: assignable; figure: drawn only; extra: added for large cohorts. */
  kind: "named" | "figure" | "extra";
};

export type Sky = {
  constellation: ChartedConstellation;
  width: number;
  height: number;
  stars: SkyStar[];
  lines: [SkyStar, SkyStar][];
};

export const SKY_WIDTH = 1000;
export const SKY_PADDING = 110;
const MIN_HEIGHT = 780;
const MAX_HEIGHT = 1350;
const RAD = Math.PI / 180;

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Signed hour difference folded into -12..12 so figures across 0h work. */
const hourOffset = (ra: number, ref: number) =>
  ((((ra - ref) % 24) + 36) % 24) - 12;

/** Gnomonic (tangent-plane) projection in degrees: xi east, eta north. */
function tangent(ra: number, dec: number, ra0: number, dec0: number) {
  const da = hourOffset(ra, ra0) * 15 * RAD;
  const d = dec * RAD;
  const d0 = dec0 * RAD;
  const cosc =
    Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(da);
  const xi = (Math.cos(d) * Math.sin(da)) / cosc;
  const eta =
    (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(da)) /
    cosc;
  return [xi / RAD, eta / RAD] as const;
}

/** Brighter stars (lower magnitude) are drawn larger. */
export const starRadius = (mag: number) => clamp(7 + (3.5 - mag) * 3.2, 6, 17);

/**
 * Projects a constellation into SVG viewBox units.
 * "melbourne" (default) shows the figure as seen from the southern
 * hemisphere: rotated 180 degrees from a northern chart, so north is down and
 * east is right. "north" gives the usual chart, north up and east left.
 */
export function projectConstellation(
  constellation: Constellation,
  orientation: "melbourne" | "north" = "melbourne",
): Sky {
  if (!hasStarData(constellation)) {
    throw new Error(`${constellation.name} has no star data yet.`);
  }
  const all = [
    ...constellation.stars.map((s) => ({ s, kind: "named" as const })),
    ...(constellation.figureOnly ?? []).map((s) => ({
      s,
      kind: "figure" as const,
    })),
  ];
  const ref = all[0].s.ra;
  const unwrapped = all.map(({ s }) => ref + hourOffset(s.ra, ref));
  const ra0 = (Math.min(...unwrapped) + Math.max(...unwrapped)) / 2;
  const decs = all.map(({ s }) => s.dec);
  const dec0 = (Math.min(...decs) + Math.max(...decs)) / 2;
  const flip = orientation === "melbourne" ? 1 : -1;
  const raw = all.map(({ s }) => {
    const [xi, eta] = tangent(s.ra, s.dec, ra0, dec0);
    return { x: flip * xi, y: flip * eta };
  });
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(Math.max(...xs) - minX, 1e-6);
  const spanY = Math.max(Math.max(...ys) - minY, 1e-6);
  const width = SKY_WIDTH;
  const inner = width - 2 * SKY_PADDING;
  const height = Math.round(
    clamp(2 * SKY_PADDING + (inner * spanY) / spanX, MIN_HEIGHT, MAX_HEIGHT),
  );
  const scale = Math.min(inner / spanX, (height - 2 * SKY_PADDING) / spanY);
  const offX = (width - spanX * scale) / 2 - minX * scale;
  const offY = (height - spanY * scale) / 2 - minY * scale;
  const stars: SkyStar[] = all.map(({ s, kind }, i) => ({
    id: s.id,
    name: s.name,
    designation: s.designation,
    meaning: s.meaning,
    x: round(raw[i].x * scale + offX),
    y: round(raw[i].y * scale + offY),
    r: round(starRadius(s.mag) * (kind === "figure" ? 0.8 : 1)),
    kind,
  }));
  const byId = new Map(stars.map((s) => [s.id, s]));
  const lines = constellation.lines.map(([a, b]) => {
    const from = byId.get(a);
    const to = byId.get(b);
    if (!from || !to) {
      throw new Error(`${constellation.name}: line ${a}-${b} has no star.`);
    }
    return [from, to] as [SkyStar, SkyStar];
  });
  return { constellation, width, height, stars, lines };
}

/* ---------- Seeded randomness ---------- */

/** mulberry32: small, fast and identical on server and client. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Assignment ---------- */

export type Placement<T> = { member: T; star: SkyStar };

/** Smallest allowed distance between any two drawn figure or member stars. */
export const MIN_STAR_GAP = 40;

/**
 * Pairs members (already in display order) with the named stars in registry
 * order. Members beyond the named stars get faint extra stars placed
 * deterministically near the figure. Named stars without a member stay in
 * the returned stars so the figure remains whole.
 */
export function assignStars<T>(
  sky: Sky,
  members: readonly T[],
  year: number,
): { placements: Placement<T>[]; stars: SkyStar[] } {
  const named = sky.stars.filter((s) => s.kind === "named");
  const extras = extraStars(
    sky,
    Math.max(0, members.length - named.length),
    year,
  );
  const slots = [...named, ...extras];
  return {
    placements: members.map((member, i) => ({ member, star: slots[i] })),
    stars: [...sky.stars, ...extras],
  };
}

function extraStars(sky: Sky, count: number, year: number): SkyStar[] {
  if (!count) return [];
  const rand = seeded(year * 7919 + 17);
  const xs = sky.stars.map((s) => s.x);
  const ys = sky.stars.map((s) => s.y);
  const margin = 70;
  const box = {
    x0: Math.max(margin, Math.min(...xs) - 150),
    x1: Math.min(sky.width - margin, Math.max(...xs) + 150),
    y0: Math.max(margin, Math.min(...ys) - 150),
    y1: Math.min(sky.height - margin, Math.max(...ys) + 150),
  };
  const taken = sky.stars.map((s) => ({ x: s.x, y: s.y }));
  const out: SkyStar[] = [];
  let gap = 110;
  for (let attempt = 1; out.length < count; attempt++) {
    // Relax the spacing gradually; the floor keeps stars apart, and the
    // whole viewBox is used once the area near the figure is exhausted.
    if (attempt % 400 === 0) gap = Math.max(MIN_STAR_GAP + 6, gap * 0.85);
    const wide = attempt > 4000;
    const x = round(
      wide
        ? margin + rand() * (sky.width - 2 * margin)
        : box.x0 + rand() * (box.x1 - box.x0),
    );
    const y = round(
      wide
        ? margin + rand() * (sky.height - 2 * margin)
        : box.y0 + rand() * (box.y1 - box.y0),
    );
    if (attempt > 20000) break;
    if (taken.some((p) => Math.hypot(p.x - x, p.y - y) < gap)) continue;
    taken.push({ x, y });
    out.push({
      id: `extra-${out.length + 1}`,
      name: "Community star",
      designation: null,
      meaning: `A symbolic place beside ${sky.constellation.name}, added for this committee member. It does not represent a catalogued star.`,
      x,
      y,
      r: 6,
      kind: "extra",
    });
  }
  return out;
}

/* ---------- Background and keyboard helpers ---------- */

export type FieldStar = {
  x: number;
  y: number;
  r: number;
  opacity: number;
  /** Seconds of animation delay, or null for a steady star. */
  twinkle: number | null;
};

/** Background stars keyed to the year, so every render draws the same sky. */
export function fieldStars(year: number, sky: Sky): FieldStar[] {
  const rand = seeded(year * 104729 + 3);
  const count = Math.round((sky.width * sky.height) / 9000);
  const out: FieldStar[] = [];
  for (let i = 0; i < count; i++) {
    const x = round(rand() * sky.width);
    const y = round(rand() * sky.height);
    const r = round(1.4 + rand() * rand() * 3);
    const opacity = round(0.18 + rand() * 0.45);
    const twinkle = rand() < 0.14 ? round(rand() * 6) : null;
    if (sky.stars.some((s) => Math.hypot(s.x - x, s.y - y) < 34)) continue;
    out.push({ x, y, r, opacity, twinkle });
  }
  return out;
}

export type Direction = "left" | "right" | "up" | "down";

/** Grow a connected figure: a star appears, then a line reaches a new star.
 * Edges are oriented from the already visible endpoint so drawing never runs
 * backwards. Disconnected decorative stars reveal after the main figure. */
export function revealSchedule(sky: Sky, stars: readonly SkyStar[]) {
  const starTimes: Record<string, number> = {};
  const lines: { from: SkyStar; to: SkyStar; at: number }[] = [];
  const remaining = [...sky.lines];
  if (stars[0]) starTimes[stars[0].id] = 0;
  let at = 0.45;
  while (remaining.length) {
    let index = remaining.findIndex(
      ([a, b]) => a.id in starTimes !== b.id in starTimes,
    );
    if (index < 0)
      index = remaining.findIndex(
        ([a, b]) => a.id in starTimes && b.id in starTimes,
      );
    if (index < 0) {
      starTimes[remaining[0][0].id] = at;
      at += 0.4;
      continue;
    }
    const [a, b] = remaining.splice(index, 1)[0];
    const [from, to] = a.id in starTimes ? [a, b] : [b, a];
    lines.push({ from, to, at });
    if (!(to.id in starTimes)) starTimes[to.id] = at + 0.55;
    at += 0.8;
  }
  for (const star of stars)
    if (!(star.id in starTimes)) {
      starTimes[star.id] = at;
      at += 0.3;
    }
  return { starTimes, lines, duration: at + 0.5 };
}

/** Tapered diffraction spikes, with four, six, eight or twelve points. */
export function sparklePath(
  index: number,
  radius: number,
  ray?: number,
): string {
  const variants = [4, 8, 6, 12, 4, 8, 6, 4];
  const rays = variants[index % variants.length];
  const rotation = [0, Math.PI / 8, Math.PI / 6, 0, Math.PI / 4][index % 5];
  if (ray !== undefined) {
    const tip = ray * 2;
    const points = [tip - 1, tip, tip + 1].map((i) => {
      const angle = rotation + (i * Math.PI) / rays;
      const length = i % 2 ? radius * 0.16 : radius * (i % 4 === 0 ? 3.5 : 2.1);
      return `${Math.cos(angle) * length},${Math.sin(angle) * length}`;
    });
    return `M0,0 L${points.join(" L")} Z`;
  }
  const points = Array.from({ length: rays * 2 }, (_, i) => {
    const angle = rotation + (i * Math.PI) / rays;
    const length = i % 2 ? radius * 0.16 : radius * (i % 4 === 0 ? 3.5 : 2.1);
    return `${Math.cos(angle) * length},${Math.sin(angle) * length}`;
  });
  return `M${points.join(" L")} Z`;
}

/**
 * Index of the nearest point in a screen direction, or from if none.
 * Points within about 60 degrees of the direction win; otherwise any point
 * on that side is used, so every star stays reachable.
 */
export function nearestInDirection(
  points: readonly { x: number; y: number }[],
  from: number,
  direction: Direction,
): number {
  const origin = points[from];
  if (!origin) return from;
  const [dx, dy] =
    direction === "left"
      ? [-1, 0]
      : direction === "right"
        ? [1, 0]
        : direction === "up"
          ? [0, -1]
          : [0, 1];
  for (const cone of [1.7, Infinity]) {
    let best = from;
    let bestCost = Infinity;
    points.forEach((p, i) => {
      if (i === from) return;
      const vx = p.x - origin.x;
      const vy = p.y - origin.y;
      const along = vx * dx + vy * dy;
      const across = Math.abs(vx * dy - vy * dx);
      if (along <= 1 || across > along * cone) return;
      const cost = along + across * 2;
      if (cost < bestCost) {
        bestCost = cost;
        best = i;
      }
    });
    if (best !== from) return best;
  }
  return from;
}
