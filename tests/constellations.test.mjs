import test from "node:test";
import assert from "node:assert/strict";
import {
  CONSTELLATIONS,
  CONSTELLATION_QUEUE,
  MIN_STAR_GAP,
  assignStars,
  cohortYear,
  constellationForYear,
  fieldStars,
  groupCohorts,
  hasStarData,
  nearestInDirection,
  projectConstellation,
  revealSchedule,
} from "../lib/constellations.ts";

const charted = ["orion", "scorpius"];

test("the reveal grows from a visible star and eventually completes every edge", () => {
  for (const id of charted) {
    const sky = projectConstellation(CONSTELLATIONS[id]);
    const reveal = revealSchedule(sky, sky.stars);
    assert.equal(reveal.starTimes[sky.stars[0].id], 0);
    assert.equal(Object.keys(reveal.starTimes).length, sky.stars.length);
    assert.equal(reveal.lines.length, sky.lines.length);
    for (const line of reveal.lines) {
      assert.ok(
        reveal.starTimes[line.from.id] < line.at,
        "a connecting line must start at an already visible star",
      );
      assert.ok(
        reveal.starTimes[line.to.id] <= line.at + 0.6,
        "its destination must appear when the line arrives",
      );
      assert.ok(
        sky.lines.some(
          ([a, b]) =>
            [a.id, b.id].includes(line.from.id) &&
            [a.id, b.id].includes(line.to.id),
        ),
      );
    }
    assert.ok(Math.max(...Object.values(reveal.starTimes)) < reveal.duration);
  }
});

test("large cohorts preserve every member without overcrowding the sky", () => {
  const input = Array.from({ length: 500 }, (_, i) => member(i));
  const result = groupCohorts(input);
  assert.equal(result.cohorts[0].members.length, 24);
  assert.equal(result.others.length, 476);
  const sky = projectConstellation(result.cohorts[0].constellation);
  assert.ok(
    assignStars(sky, result.cohorts[0].members, 2026).placements.every(
      (p) => p.star,
    ),
  );
});
const member = (i, years = "2026", extra = {}) => ({
  id: "m" + String(i).padStart(2, "0"),
  name: "Member " + i,
  sort_order: i,
  created_at: "2026-01-01T00:00:00Z",
  years_active: years,
  ...extra,
});
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function assertSpaced(stars, width, height, label) {
  for (const s of stars) {
    assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y), label + " " + s.id);
    assert.ok(s.x - s.r >= 0 && s.x + s.r <= width, label + " " + s.id + " x");
    assert.ok(s.y - s.r >= 0 && s.y + s.r <= height, label + " " + s.id + " y");
  }
  for (let i = 0; i < stars.length; i++)
    for (let j = i + 1; j < stars.length; j++)
      assert.ok(
        gap(stars[i], stars[j]) >= MIN_STAR_GAP,
        label + ": " + stars[i].id + " and " + stars[j].id + " overlap",
      );
}

test("the year queue never repeats a constellation", () => {
  assert.equal(new Set(CONSTELLATION_QUEUE).size, CONSTELLATION_QUEUE.length);
  for (const id of CONSTELLATION_QUEUE) assert.ok(CONSTELLATIONS[id], id);
});

test("each year from 2026 to 2034 resolves to its constellation", () => {
  const expected = [
    "Orion",
    "Scorpius",
    "Leo",
    "Crux",
    "Gemini",
    "Sagittarius",
    "Pegasus",
    "Canis Major",
    "Taurus",
  ];
  expected.forEach((name, i) =>
    assert.equal(constellationForYear(2026 + i)?.name, name),
  );
  assert.equal(constellationForYear(2025), null);
  assert.equal(constellationForYear(2035), null);
  assert.ok(hasStarData(constellationForYear(2026)));
  assert.ok(hasStarData(constellationForYear(2027)));
  assert.ok(!hasStarData(constellationForYear(2028)));
});

test("charted stars project inside the sky without overlapping", () => {
  for (const id of charted) {
    const sky = projectConstellation(CONSTELLATIONS[id]);
    assertSpaced(sky.stars, sky.width, sky.height, id);
  }
});

test("Melbourne view turns Orion upside down: Rigel above Betelgeuse", () => {
  const find = (sky, id) => sky.stars.find((s) => s.id === id);
  const south = projectConstellation(CONSTELLATIONS.orion);
  const north = projectConstellation(CONSTELLATIONS.orion, "north");
  assert.ok(find(south, "rigel").y < find(south, "betelgeuse").y);
  assert.ok(find(north, "rigel").y > find(north, "betelgeuse").y);
  // Betelgeuse (east) is right of Bellatrix from Melbourne, left on a northern chart.
  assert.ok(find(south, "betelgeuse").x > find(south, "bellatrix").x);
  assert.ok(find(north, "betelgeuse").x < find(north, "bellatrix").x);
});

test("every line segment references a real star in its constellation", () => {
  for (const id of charted) {
    const c = CONSTELLATIONS[id];
    const ids = new Set([...c.stars, ...(c.figureOnly ?? [])].map((s) => s.id));
    for (const [a, b] of c.lines) {
      assert.ok(ids.has(a), id + " line star " + a);
      assert.ok(ids.has(b), id + " line star " + b);
      assert.notEqual(a, b);
    }
    for (const s of c.stars)
      assert.ok(s.meaning.length > 20, s.id + " needs a meaning");
  }
});

test("cohort year is the last four-digit year from 2000 to 2099", () => {
  assert.equal(cohortYear("2026"), 2026);
  assert.equal(cohortYear("2025-2026"), 2026);
  assert.equal(cohortYear("2025–2026"), 2026);
  assert.equal(cohortYear("2026 S1"), 2026);
  assert.equal(cohortYear(""), null);
  assert.equal(cohortYear(null), null);
  assert.equal(cohortYear(undefined), null);
  assert.equal(cohortYear("25-26"), null);
  assert.equal(cohortYear("1999"), null);
  assert.equal(cohortYear("12026"), null);
});

test("Orion assignment follows registry order for 6, 8 and 11 members", () => {
  const sky = projectConstellation(CONSTELLATIONS.orion);
  const order = [
    "rigel",
    "betelgeuse",
    "meissa",
    "alnilam",
    "mintaka",
    "alnitak",
    "bellatrix",
    "saiph",
  ];
  for (const n of [6, 8, 11]) {
    const members = Array.from({ length: n }, (_, i) => member(i));
    const { placements, stars } = assignStars(sky, members, 2026);
    assert.equal(placements.length, n);
    placements.slice(0, 8).forEach((p, i) => assert.equal(p.star.id, order[i]));
    // The whole figure is always drawn; unassigned stars stay in the sky.
    for (const id of order) assert.ok(stars.some((s) => s.id === id));
    const extras = stars.filter((s) => s.kind === "extra");
    assert.equal(extras.length, Math.max(0, n - 8));
    assert.equal(new Set(placements.map((p) => p.star.id)).size, n);
    assertSpaced(stars, sky.width, sky.height, "orion " + n);
  }
  // Deterministic: the same year places extra stars in the same spots.
  const a = assignStars(
    sky,
    Array.from({ length: 11 }, (_, i) => member(i)),
    2026,
  );
  const b = assignStars(
    sky,
    Array.from({ length: 11 }, (_, i) => member(i)),
    2026,
  );
  assert.deepEqual(a.stars, b.stars);
});

test("Scorpius takes 11 members on named stars and 12 with one extra", () => {
  const sky = projectConstellation(CONSTELLATIONS.scorpius);
  const eleven = assignStars(
    sky,
    Array.from({ length: 11 }, (_, i) => member(i)),
    2027,
  );
  assert.ok(eleven.placements.every((p) => p.star.kind === "named"));
  const twelve = assignStars(
    sky,
    Array.from({ length: 12 }, (_, i) => member(i)),
    2027,
  );
  assert.equal(twelve.placements[11].star.kind, "extra");
  assertSpaced(twelve.stars, sky.width, sky.height, "scorpius 12");
});

test("grouping sorts cohorts and sends the rest to the grid", () => {
  const rows = [
    member(3, "2026"),
    member(1, "2026"),
    member(1, "2025-2026", { id: "m00", created_at: "2026-03-01T00:00:00Z" }),
    member(2, "2027"),
    member(4, "2025"),
    member(5, "2028"),
    member(6, "25-26"),
    member(7, null),
  ];
  const { cohorts, others } = groupCohorts(rows);
  assert.deepEqual(
    cohorts.map((c) => c.year),
    [2027, 2026],
  );
  assert.deepEqual(
    cohorts[1].members.map((m) => m.id),
    ["m01", "m00", "m03"],
  );
  assert.deepEqual(
    others.map((m) => m.id),
    ["m04", "m05", "m06", "m07"],
  );
});

test("field stars are identical for the same year", () => {
  const sky = projectConstellation(CONSTELLATIONS.orion);
  assert.deepEqual(fieldStars(2026, sky), fieldStars(2026, sky));
  assert.notDeepEqual(fieldStars(2026, sky), fieldStars(2027, sky));
});

test("arrow keys move to the nearest star in that direction", () => {
  const pts = [
    { x: 100, y: 100 },
    { x: 200, y: 105 },
    { x: 400, y: 100 },
    { x: 110, y: 300 },
  ];
  assert.equal(nearestInDirection(pts, 0, "right"), 1);
  assert.equal(nearestInDirection(pts, 0, "down"), 3);
  assert.equal(nearestInDirection(pts, 1, "down"), 3);
  assert.equal(nearestInDirection(pts, 0, "left"), 0);
  assert.equal(nearestInDirection(pts, 2, "left"), 1);
});
