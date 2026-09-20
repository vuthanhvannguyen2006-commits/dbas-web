/* Album layout composer: pure, dependency-free helpers.
   Shared by the public album page, the admin preview, and the node:test suite,
   so this file must stay erasable-TypeScript only (no enums, no imports). */

export const ALBUM_FORMATS = ["grid", "gallery-wall", "mosaic", "story"] as const;
export type AlbumFormat = (typeof ALBUM_FORMATS)[number];

/* The allowlist. A (format, template) pair is valid only if it is listed here,
   and the database check constraint in the layout migration mirrors it. */
export const ALBUM_TEMPLATES = {
  grid: ["regular"],
  "gallery-wall": ["salon", "symmetry"],
  mosaic: ["tiles", "bands"],
  story: ["chapters", "filmstrip"],
} as const;
export type AlbumTemplateMap = typeof ALBUM_TEMPLATES;
export type AlbumTemplate = AlbumTemplateMap[AlbumFormat][number];

export type AlbumLayoutSetting = {
  format: AlbumFormat;
  template: AlbumTemplate;
};

/* Every album that has not been explicitly changed renders as the regular grid. */
export const DEFAULT_LAYOUT: AlbumLayoutSetting = {
  format: "grid",
  template: "regular",
};

/* The public album page loads photos 24 at a time; layouts plan one page. */
export const ALBUM_PAGE_SIZE = 24;

export const FORMAT_INFO: Record<
  AlbumFormat,
  { label: string; blurb: string }
> = {
  grid: {
    label: "Regular grid",
    blurb: "Even thumbnails in tidy rows. The default for every album.",
  },
  "gallery-wall": {
    label: "Gallery wall",
    blurb: "Framed photos of mixed proportions, hung like a salon wall.",
  },
  mosaic: {
    label: "Mosaic",
    blurb: "Tightly fitted tiles of different sizes with no gaps.",
  },
  story: {
    label: "Story",
    blurb: "Photos told one at a time, led by their descriptions.",
  },
};

export const TEMPLATE_INFO: Record<
  AlbumTemplate,
  { label: string; blurb: string }
> = {
  regular: { label: "Regular", blurb: "Three even columns." },
  salon: {
    label: "Salon hang",
    blurb: "Staggered ivory-matted frames in clustered hangs.",
  },
  symmetry: {
    label: "Symmetrical hang",
    blurb: "Gold frames balanced around a central picture.",
  },
  tiles: {
    label: "Tessellate",
    blurb: "One feature tile with smaller tiles packed around it.",
  },
  bands: {
    label: "Banded",
    blurb: "Wide banner rows alternating with rows of squares.",
  },
  chapters: {
    label: "Chapters",
    blurb: "A scrolling narrative, photo and words side by side.",
  },
  filmstrip: {
    label: "Filmstrip",
    blurb: "A stage with a reel of thumbnails to step through.",
  },
};

function isFormat(value: unknown): value is AlbumFormat {
  return (
    typeof value === "string" &&
    (ALBUM_FORMATS as readonly string[]).includes(value)
  );
}

export function templatesFor(format: AlbumFormat): readonly AlbumTemplate[] {
  return ALBUM_TEMPLATES[format];
}

export function isAllowedLayout(format: unknown, template: unknown): boolean {
  return (
    isFormat(format) &&
    typeof template === "string" &&
    (ALBUM_TEMPLATES[format] as readonly string[]).includes(template)
  );
}

export function defaultTemplateFor(format: AlbumFormat): AlbumTemplate {
  return ALBUM_TEMPLATES[format][0];
}

/* Turns whatever the database (or an older deployment) returned into a setting
   the renderer can trust. Anything not on the allowlist, including a missing
   column before the migration is applied, is the regular grid. */
export function resolveLayout(
  row:
    | { layout_format?: unknown; layout_template?: unknown }
    | null
    | undefined,
): AlbumLayoutSetting {
  const format = row?.layout_format;
  const template = row?.layout_template;
  if (isAllowedLayout(format, template))
    return { format, template } as AlbumLayoutSetting;
  return { ...DEFAULT_LAYOUT };
}

export function layoutColumns(setting: AlbumLayoutSetting) {
  return { layout_format: setting.format, layout_template: setting.template };
}

export function sameLayout(a: AlbumLayoutSetting, b: AlbumLayoutSetting) {
  return a.format === b.format && a.template === b.template;
}

/* ------------------------------------------------------------------ */
/* Cluster patterns                                                    */
/* ------------------------------------------------------------------ */

/* A cluster is a small CSS grid holding a handful of photos. Patterns are
   drawn as text: every distinct letter is one frame, "." is bare wall. Each
   letter must fill a rectangle exactly, which parseSlots enforces. */
export type Slot = { col: number; row: number; colSpan: number; rowSpan: number };
export type ClusterSlot = Slot & { index: number };
export type Cluster = {
  cols: number;
  rows: number;
  /* Photo indexes (within the planned page) start at start and run size long. */
  start: number;
  size: number;
  slots: ClusterSlot[];
};

type Flow = "rows" | "columns";
type Alternate = "mirror" | "flip" | "none";
type ClusterTemplate = {
  capacity: number;
  /* Reading order: left-to-right then down ("rows") or column by column. */
  flow: Flow;
  /* How every second cluster is varied so long albums do not look stamped. */
  alternate: Alternate;
  patterns: Record<number, readonly string[]>;
};

const rep = (row: string, times: number): string[] =>
  Array.from({ length: times }, () => row);

const CLUSTER_TEMPLATES: {
  "gallery-wall": Record<"salon" | "symmetry", ClusterTemplate>;
  mosaic: Record<"tiles" | "bands", ClusterTemplate>;
} = {
  "gallery-wall": {
    /* Staggered, mixed portrait and landscape frames. */
    salon: {
      capacity: 6,
      flow: "rows",
      alternate: "mirror",
      patterns: {
        1: rep(".AAAAAA.", 6),
        2: [
          "AAA.......",
          "AAA.......",
          "AAA.BBBBBB",
          "AAA.BBBBBB",
          "AAA.BBBBBB",
          "....BBBBBB",
        ],
        3: [
          "AAAABBBB..",
          "AAAABBBB..",
          "AAAABBBB..",
          "AAAA.CCCCC",
          "AAAA.CCCCC",
          "AAAA.CCCCC",
        ],
        4: [
          "AAAABBBB....",
          "AAAABBBBCCCC",
          "AAAABBBBCCCC",
          "AAAADDDDCCCC",
          "....DDDDCCCC",
          "....DDDD....",
        ],
        5: [
          "AAABBBBBCCCC",
          "AAABBBBBCCCC",
          "AAABBBBBCCCC",
          "AAA..EEECCCC",
          "DDDDDEEECCCC",
          "DDDDDEEE....",
          "DDDDDEEE....",
        ],
        6: [
          "AAABBBBCCCDD",
          "AAABBBBCCCDD",
          "AAABBBBCCCDD",
          "AAA....CCC..",
          "EEEEE.FFFFFF",
          "EEEEE.FFFFFF",
          "EEEEE.FFFFFF",
          "EEEEE.FFFFFF",
        ],
      },
    },
    /* Mirror-balanced hangs around a centre frame, like the compact walls. */
    symmetry: {
      capacity: 5,
      flow: "columns",
      alternate: "none",
      patterns: {
        1: rep("..AAAA..", 5),
        2: rep("AAAA.BBBB", 5),
        3: [
          "...BBBBBB...",
          ...rep("AAABBBBBBCCC", 4),
          "...BBBBBB...",
        ],
        4: [...rep("AAAABBBBDDDD", 3), ...rep("AAAACCCCDDDD", 3)],
        5: [...rep("AAABBBBBBDDD", 3), ...rep("CCCBBBBBBEEE", 3)],
      },
    },
  },
  mosaic: {
    /* One feature tile, smaller tiles packed around it, no bare wall. */
    tiles: {
      capacity: 6,
      flow: "rows",
      alternate: "mirror",
      patterns: {
        1: rep("AAAAAA", 4),
        2: rep("AAABBB", 3),
        3: [...rep("AAABBB", 2), ...rep("AAACCC", 2)],
        4: ["AAAABB", "AAAACC", "AAAADD"],
        5: [...rep("AAAABB", 2), ...rep("CCDDEE", 2)],
        6: ["AAAABB", "AAAACC", "DDEEFF", "DDEEFF"],
      },
    },
    /* Full-width banners alternating with rows of squares. */
    bands: {
      capacity: 5,
      flow: "rows",
      alternate: "flip",
      patterns: {
        1: rep("AAAAAA", 4),
        2: [...rep("AAAAAA", 3), ...rep("BBBBBB", 3)],
        3: [...rep("AAAAAA", 3), ...rep("BBBCCC", 3)],
        4: [...rep("AAAAAA", 3), ...rep("BBCCDD", 2)],
        5: [...rep("AABBCC", 2), ...rep("DDDEEE", 2)],
      },
    },
  },
};

const mirrorPattern = (rows: readonly string[]) =>
  rows.map((row) => Array.from(row).reverse().join(""));
const flipPattern = (rows: readonly string[]) => [...rows].reverse();

/* Reads a drawn pattern into slots ordered for reading. Throws on any pattern
   whose letters are not exact rectangles, so a bad drawing fails the tests
   rather than silently producing overlapping or missing frames. */
export function parseSlots(
  pattern: readonly string[],
  flow: Flow,
): { cols: number; rows: number; slots: Slot[] } {
  const rows = pattern.length;
  const cols = pattern[0]?.length ?? 0;
  if (!rows || !cols) throw new Error("Pattern is empty.");
  const boxes = new Map<
    string,
    { minCol: number; maxCol: number; minRow: number; maxRow: number; cells: number }
  >();
  pattern.forEach((line, r) => {
    if (line.length !== cols) throw new Error("Pattern rows differ in length.");
    Array.from(line).forEach((ch, c) => {
      if (ch === ".") return;
      const box = boxes.get(ch) ?? {
        minCol: c,
        maxCol: c,
        minRow: r,
        maxRow: r,
        cells: 0,
      };
      box.minCol = Math.min(box.minCol, c);
      box.maxCol = Math.max(box.maxCol, c);
      box.minRow = Math.min(box.minRow, r);
      box.maxRow = Math.max(box.maxRow, r);
      box.cells++;
      boxes.set(ch, box);
    });
  });
  const slots: Slot[] = [];
  for (const [ch, box] of boxes) {
    const colSpan = box.maxCol - box.minCol + 1;
    const rowSpan = box.maxRow - box.minRow + 1;
    if (colSpan * rowSpan !== box.cells)
      throw new Error(`Frame ${ch} is not a solid rectangle.`);
    slots.push({ col: box.minCol + 1, row: box.minRow + 1, colSpan, rowSpan });
  }
  slots.sort((a, b) =>
    flow === "rows" ? a.row - b.row || a.col - b.col : a.col - b.col || a.row - b.row,
  );
  return { cols, rows, slots };
}

function clusterTemplate(
  format: AlbumFormat,
  template: AlbumTemplate,
): ClusterTemplate | null {
  if (!isAllowedLayout(format, template)) return null;
  if (format === "gallery-wall")
    return (
      CLUSTER_TEMPLATES["gallery-wall"][template as "salon" | "symmetry"] ?? null
    );
  if (format === "mosaic")
    return CLUSTER_TEMPLATES.mosaic[template as "tiles" | "bands"] ?? null;
  return null;
}

/* The pattern for a cluster of `size` photos. Odd-numbered clusters are varied
   (mirrored or flipped) so a long album alternates its hang. */
export function clusterPattern(
  format: AlbumFormat,
  template: AlbumTemplate,
  size: number,
  ordinal: number,
): string[] | null {
  const config = clusterTemplate(format, template);
  const base = config?.patterns[size];
  if (!config || !base) return null;
  if (ordinal % 2 === 0 || config.alternate === "none") return [...base];
  return config.alternate === "mirror" ? mirrorPattern(base) : flipPattern(base);
}

export function clusterCapacity(
  format: AlbumFormat,
  template: AlbumTemplate,
): number {
  return clusterTemplate(format, template)?.capacity ?? 0;
}

/* Splits a photo count into cluster sizes. Full clusters come first; a lone
   photo is never left orphaned when it can share the previous cluster's
   photos instead (6 + 1 becomes 4 + 3). */
export function chunkSizes(total: number, capacity: number): number[] {
  if (!Number.isFinite(total) || total <= 0 || capacity < 1) return [];
  const count = Math.floor(total);
  const full = Math.floor(count / capacity);
  const remainder = count % capacity;
  const sizes: number[] = Array.from({ length: full }, () => capacity);
  if (!remainder) return sizes;
  if (remainder === 1 && full > 0) {
    const pool = capacity + 1;
    const first = Math.ceil(pool / 2);
    sizes[full - 1] = first;
    sizes.push(pool - first);
  } else sizes.push(remainder);
  return sizes;
}

const planCache = new Map<string, ReturnType<typeof parseSlots>>();
function cachedSlots(pattern: string[], flow: Flow) {
  const key = `${flow}|${pattern.join("/")}`;
  let hit = planCache.get(key);
  if (!hit) {
    hit = parseSlots(pattern, flow);
    planCache.set(key, hit);
  }
  return hit;
}

/* Plans the clusters for one page of `count` photos. Every photo index in
   0..count-1 appears in exactly one slot, in ascending order. Grid and story
   layouts are not cluster-based, so they plan nothing. */
export function planClusters(
  format: AlbumFormat,
  template: AlbumTemplate,
  count: number,
): Cluster[] {
  const config = clusterTemplate(format, template);
  if (!config) return [];
  let start = 0;
  return chunkSizes(count, config.capacity).map((size, ordinal) => {
    const pattern = clusterPattern(format, template, size, ordinal);
    if (!pattern) throw new Error(`No ${format}/${template} pattern for ${size}.`);
    const { cols, rows, slots } = cachedSlots(pattern, config.flow);
    if (slots.length !== size)
      throw new Error(`Pattern for ${size} photos holds ${slots.length}.`);
    const cluster: Cluster = {
      cols,
      rows,
      start,
      size,
      slots: slots.map((slot, i) => ({ ...slot, index: start + i })),
    };
    start += size;
    return cluster;
  });
}

/* Frames drawn wider than this take a full row when a hang reflows on phones. */
export const WIDE_FRAME_RATIO = 1.8;

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

export function pageCount(total: number, size: number = ALBUM_PAGE_SIZE) {
  return total > 0 ? Math.ceil(total / size) : 0;
}

/* Keyboard stepping for the story filmstrip. Returns the new index, or null
   for keys the strip does not handle so the browser default is left alone. */
export function stepIndex(
  key: string,
  index: number,
  count: number,
): number | null {
  if (count < 1) return null;
  const last = count - 1;
  const at = Math.min(Math.max(index, 0), last);
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return Math.min(at + 1, last);
    case "ArrowLeft":
    case "ArrowUp":
      return Math.max(at - 1, 0);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}
