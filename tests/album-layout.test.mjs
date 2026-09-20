import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ALBUM_FORMATS,
  ALBUM_PAGE_SIZE,
  ALBUM_TEMPLATES,
  DEFAULT_LAYOUT,
  chunkSizes,
  clusterCapacity,
  clusterPattern,
  defaultTemplateFor,
  isAllowedLayout,
  layoutColumns,
  pageCount,
  parseSlots,
  planClusters,
  resolveLayout,
  sameLayout,
  stepIndex,
  templatesFor,
} from "../lib/album-layout.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const clusterTemplates = [
  ["gallery-wall", "salon"],
  ["gallery-wall", "symmetry"],
  ["mosaic", "tiles"],
  ["mosaic", "bands"],
];
const overlaps = (a, b) =>
  a.col < b.col + b.colSpan &&
  b.col < a.col + a.colSpan &&
  a.row < b.row + b.rowSpan &&
  b.row < a.row + a.rowSpan;

test("each new format offers at least two templates; grid stays the default", () => {
  assert.deepEqual([...ALBUM_FORMATS], ["grid", "gallery-wall", "mosaic", "story"]);
  for (const format of ["gallery-wall", "mosaic", "story"])
    assert.ok(templatesFor(format).length >= 2, `${format} needs >=2 templates`);
  assert.deepEqual(DEFAULT_LAYOUT, { format: "grid", template: "regular" });
  for (const format of ALBUM_FORMATS)
    assert.ok(isAllowedLayout(format, defaultTemplateFor(format)));
});

test("only listed format/template pairs are allowed", () => {
  for (const [format, list] of Object.entries(ALBUM_TEMPLATES))
    for (const template of list) assert.equal(isAllowedLayout(format, template), true);
  // A valid template under the wrong format is not valid.
  assert.equal(isAllowedLayout("mosaic", "salon"), false);
  assert.equal(isAllowedLayout("story", "tiles"), false);
  assert.equal(isAllowedLayout("grid", "salon"), false);
  for (const junk of [null, undefined, 3, {}, [], "", "__proto__", "constructor", "toString"]) {
    assert.equal(isAllowedLayout(junk, "regular"), false);
    assert.equal(isAllowedLayout("grid", junk), false);
  }
});

test("unknown, partial or missing settings resolve to the regular grid", () => {
  const grid = { format: "grid", template: "regular" };
  for (const row of [
    null,
    undefined,
    {},
    { layout_format: "mosaic" },
    { layout_template: "tiles" },
    { layout_format: "carousel", layout_template: "regular" },
    { layout_format: "mosaic", layout_template: "salon" },
    { layout_format: "<script>", layout_template: "tiles" },
    { layout_format: 1, layout_template: 2 },
  ])
    assert.deepEqual(resolveLayout(row), grid);
  assert.deepEqual(
    resolveLayout({ layout_format: "gallery-wall", layout_template: "symmetry" }),
    { format: "gallery-wall", template: "symmetry" },
  );
  // Callers may mutate the result without corrupting the shared default.
  resolveLayout(null).format = "story";
  assert.equal(DEFAULT_LAYOUT.format, "grid");
});

test("layout helpers compare and serialise settings", () => {
  const a = { format: "story", template: "chapters" };
  assert.equal(sameLayout(a, { ...a }), true);
  assert.equal(sameLayout(a, { format: "story", template: "filmstrip" }), false);
  assert.deepEqual(layoutColumns(a), {
    layout_format: "story",
    layout_template: "chapters",
  });
});

test("parseSlots accepts solid rectangles and rejects anything else", () => {
  const { cols, rows, slots } = parseSlots(["AAB", "AAB", ".CC"], "rows");
  assert.equal(cols, 3);
  assert.equal(rows, 3);
  assert.deepEqual(slots, [
    { col: 1, row: 1, colSpan: 2, rowSpan: 2 },
    { col: 3, row: 1, colSpan: 1, rowSpan: 2 },
    { col: 2, row: 3, colSpan: 2, rowSpan: 1 },
  ]);
  assert.throws(() => parseSlots(["AB", "BA"], "rows"), /solid rectangle/);
  assert.throws(() => parseSlots(["AA", "A."], "rows"), /solid rectangle/);
  assert.throws(() => parseSlots(["AAA", "AA"], "rows"), /differ in length/);
  assert.throws(() => parseSlots([], "rows"), /empty/);
});

test("every drawn pattern is a set of solid, non-overlapping frames", () => {
  for (const [format, template] of clusterTemplates) {
    const capacity = clusterCapacity(format, template);
    assert.ok(capacity >= 4, `${format}/${template} capacity`);
    for (let size = 1; size <= capacity; size++)
      for (const ordinal of [0, 1]) {
        const pattern = clusterPattern(format, template, size, ordinal);
        assert.ok(pattern, `${format}/${template} has a ${size}-photo pattern`);
        const { cols, rows, slots } = parseSlots(pattern, "rows");
        assert.equal(slots.length, size, `${format}/${template}/${size} frame count`);
        for (const slot of slots) {
          assert.ok(slot.col >= 1 && slot.col + slot.colSpan - 1 <= cols);
          assert.ok(slot.row >= 1 && slot.row + slot.rowSpan - 1 <= rows);
        }
        for (let i = 0; i < slots.length; i++)
          for (let j = i + 1; j < slots.length; j++)
            assert.equal(
              overlaps(slots[i], slots[j]),
              false,
              `${format}/${template}/${size} frames ${i},${j} overlap`,
            );
      }
  }
});

test("mosaic patterns leave no bare wall; gallery walls are allowed gaps", () => {
  for (const template of ["tiles", "bands"])
    for (let size = 1; size <= clusterCapacity("mosaic", template); size++)
      for (const ordinal of [0, 1])
        assert.ok(
          !clusterPattern("mosaic", template, size, ordinal).join("").includes("."),
          `mosaic/${template}/${size} has a gap`,
        );
});

test("symmetrical hangs are left-right mirror images at every size", () => {
  for (let size = 1; size <= clusterCapacity("gallery-wall", "symmetry"); size++) {
    const { cols, slots } = parseSlots(
      clusterPattern("gallery-wall", "symmetry", size, 0),
      "columns",
    );
    const key = (s) => `${s.col}:${s.row}:${s.colSpan}:${s.rowSpan}`;
    const mirrored = slots
      .map((s) => ({ ...s, col: cols + 1 - (s.col + s.colSpan - 1) }))
      .map(key)
      .sort();
    assert.deepEqual(mirrored, slots.map(key).sort(), `size ${size}`);
  }
});

test("chunkSizes never orphans a single photo and never exceeds capacity", () => {
  assert.deepEqual(chunkSizes(0, 6), []);
  assert.deepEqual(chunkSizes(-3, 6), []);
  assert.deepEqual(chunkSizes(Number.NaN, 6), []);
  assert.deepEqual(chunkSizes(1, 6), [1]);
  assert.deepEqual(chunkSizes(6, 6), [6]);
  assert.deepEqual(chunkSizes(7, 6), [4, 3]);
  assert.deepEqual(chunkSizes(13, 6), [6, 4, 3]);
  assert.deepEqual(chunkSizes(24, 6), [6, 6, 6, 6]);
  for (const capacity of [3, 5, 6])
    for (let total = 1; total <= 80; total++) {
      const sizes = chunkSizes(total, capacity);
      assert.equal(sizes.reduce((a, b) => a + b, 0), total);
      assert.ok(sizes.every((n) => n >= 1 && n <= capacity));
      if (total > 1) assert.ok(!sizes.includes(1), `${total}/${capacity} orphaned`);
    }
});

test("every photo count places each photo exactly once, in order", () => {
  for (const [format, template] of clusterTemplates)
    for (let count = 0; count <= 60; count++) {
      const clusters = planClusters(format, template, count);
      const placed = clusters.flatMap((c) => c.slots.map((s) => s.index));
      assert.deepEqual(
        placed,
        Array.from({ length: count }, (_, i) => i),
        `${format}/${template}/${count} placement`,
      );
      let next = 0;
      for (const cluster of clusters) {
        assert.equal(cluster.start, next);
        assert.equal(cluster.size, cluster.slots.length);
        next += cluster.size;
      }
    }
});

test("the requested album sizes plan cleanly: 1, 2, 3, 8 and 25 photos", () => {
  for (const [format, template] of clusterTemplates)
    for (const count of [1, 2, 3, 8, 25]) {
      const clusters = planClusters(format, template, count);
      assert.equal(clusters.reduce((n, c) => n + c.size, 0), count);
      if (count > 1) assert.ok(clusters.every((c) => c.size > 1));
    }
  assert.equal(planClusters("mosaic", "tiles", 1).length, 1);
  assert.equal(planClusters("mosaic", "tiles", 2)[0].slots.length, 2);
});

test("25 photos paginate as 24 + 1 and every page is planned without loss", () => {
  const ids = Array.from({ length: 25 }, (_, i) => `photo-${i}`);
  assert.equal(ALBUM_PAGE_SIZE, 24);
  assert.equal(pageCount(25), 2);
  assert.equal(pageCount(24), 1);
  assert.equal(pageCount(0), 0);
  for (const [format, template] of clusterTemplates) {
    const seen = [];
    for (let page = 0; page < pageCount(ids.length); page++) {
      const slice = ids.slice(page * ALBUM_PAGE_SIZE, (page + 1) * ALBUM_PAGE_SIZE);
      for (const cluster of planClusters(format, template, slice.length))
        for (const slot of cluster.slots) seen.push(slice[slot.index]);
    }
    assert.deepEqual(seen, ids, `${format}/${template} lost or reordered photos`);
  }
});

test("slots are numbered in reading order for each template", () => {
  for (const [format, template] of clusterTemplates)
    for (const cluster of planClusters(format, template, 25)) {
      const positions = cluster.slots.map((s) => [s.row, s.col]);
      const sorted = [...positions].sort((a, b) =>
        template === "symmetry" ? a[1] - b[1] || a[0] - b[0] : a[0] - b[0] || a[1] - b[1],
      );
      assert.deepEqual(positions, sorted, `${format}/${template}`);
    }
});

test("formats that are not cluster based, or invalid pairs, plan nothing", () => {
  assert.deepEqual(planClusters("grid", "regular", 10), []);
  assert.deepEqual(planClusters("story", "chapters", 10), []);
  assert.deepEqual(planClusters("story", "filmstrip", 10), []);
  assert.deepEqual(planClusters("mosaic", "salon", 10), []);
  assert.deepEqual(planClusters("nonsense", "tiles", 10), []);
  assert.equal(clusterCapacity("grid", "regular"), 0);
  assert.equal(clusterPattern("mosaic", "tiles", 99, 0), null);
});

test("stepIndex drives filmstrip keyboard navigation and clamps at the ends", () => {
  assert.equal(stepIndex("ArrowRight", 0, 5), 1);
  assert.equal(stepIndex("ArrowDown", 3, 5), 4);
  assert.equal(stepIndex("ArrowRight", 4, 5), 4);
  assert.equal(stepIndex("ArrowLeft", 0, 5), 0);
  assert.equal(stepIndex("ArrowUp", 3, 5), 2);
  assert.equal(stepIndex("Home", 3, 5), 0);
  assert.equal(stepIndex("End", 1, 5), 4);
  assert.equal(stepIndex("Enter", 1, 5), null);
  assert.equal(stepIndex("Tab", 1, 5), null);
  assert.equal(stepIndex("ArrowRight", 0, 0), null);
  assert.equal(stepIndex("ArrowRight", 99, 3), 2);
  assert.equal(stepIndex("ArrowLeft", -4, 3), 0);
});

test("migration is additive and mirrors the allowlist exactly", () => {
  const sql = read("../supabase/migrations/20260919032006_album_layout_settings.sql");
  const code = sql.replace(/--.*$/gm, "");
  assert.match(code, /alter table public\.memory_albums/i);
  assert.match(code, /add column layout_format text not null default 'grid'/i);
  assert.match(code, /add column layout_template text not null default 'regular'/i);
  // Only additions: nothing dropped, rewritten or re-permissioned.
  for (const forbidden of [/\bdrop\b/i, /\bdelete\b/i, /\btruncate\b/i, /\bupdate\b(?!\s+public\.memory_albums set)/i, /\bgrant\b/i, /\brevoke\b/i, /\bpolicy\b/i, /\btrigger\b/i])
    assert.doesNotMatch(code, forbidden);
  const pairs = [...code.matchAll(/\('([a-z-]+)',\s*'([a-z-]+)'\)/g)].map((m) => `${m[1]}/${m[2]}`);
  const expected = Object.entries(ALBUM_TEMPLATES).flatMap(([f, list]) => list.map((t) => `${f}/${t}`));
  assert.deepEqual([...pairs].sort(), [...expected].sort());
});

test("layout migration sorts after every earlier hall migration", () => {
  const names = [
    "20260908094023_hall_of_memories.sql",
    "20260908111601_hall_cover_and_photo_order.sql",
    "20260919032006_album_layout_settings.sql",
  ];
  assert.deepEqual([...names].sort(), names);
});

test("public grids load thumbnails; only the viewer touches original URLs", () => {
  const renderer = read("../components/memories/album-renderer.tsx");
  assert.doesNotMatch(renderer, /image_url/);
  assert.match(renderer, /thumbnail_url/);
  const view = read("../components/memories/album-view.tsx");
  const viewer = view.slice(view.indexOf("function Viewer"), view.indexOf("export default function AlbumView"));
  assert.match(viewer, /photo\.image_url/);
  assert.doesNotMatch(view.slice(view.indexOf("export default function AlbumView")), /image_url/);
  // The admin preview shares the same renderer rather than a copy.
  assert.match(read("../components/memories/album-layout-picker.tsx"), /from "\.\/album-renderer"/);
  assert.match(view, /from "\.\/album-renderer"/);
});

test("renderer honours reduced motion and reflows for phones", () => {
  const css = read("../components/memories/album-renderer.module.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation: none/);
  assert.match(css, /@container album \(max-width: 640px\)/);
  assert.match(css, /container-type: inline-size/);
  assert.match(css, /:focus-visible/);
});
