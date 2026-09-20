import test from "node:test";
import assert from "node:assert/strict";
import {
  batchIncomplete,
  imageProblem,
  initials,
  pageRange,
  runUpload,
} from "../lib/memories-core.ts";
const file = { type: "image/png", size: 500, name: "photo.png" };
const thumb = new Blob(["small"], { type: "image/webp" });
const job = () => ({ id: "stable-id", file, phase: "waiting" });
test("bounds enforce allowed images and inclusive 5 MiB", () => {
  assert.equal(
    imageProblem({ type: "image/png", size: 5 * 1024 * 1024 }),
    null,
  );
  assert.match(
    imageProblem({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    /5 MiB/,
  );
  assert.match(imageProblem({ type: "image/svg+xml", size: 1 }), /PNG/);
  assert.match(imageProblem({ type: "image/png", size: 0 }), /non-empty/);
});
test("pagination has no overlap and initials handle whitespace", () => {
  assert.deepEqual(pageRange(1, 12), [0, 11]);
  assert.deepEqual(pageRange(2, 12), [12, 23]);
  assert.deepEqual(pageRange(2, 24), [24, 47]);
  assert.equal(initials("  Alex   Nguyen "), "AN");
  assert.equal(initials(""), "");
});
test("thumbnail upload failure retries only incomplete phases and saves only complete pairs", async () => {
  const j = job();
  let thumbs = 0,
    originals = 0,
    uploads = 0,
    saves = 0;
  const ids = [];
  const steps = {
    thumbnail: async () => {
      thumbs++;
      return thumb;
    },
    upload: async (id, blob, original) => {
      ids.push(id);
      if (original) {
        originals++;
        return "original";
      }
      uploads++;
      if (uploads === 1) throw new Error("network");
      return "thumb";
    },
    save: async (item) => {
      saves++;
      assert.equal(item.originalUrl, "original");
      assert.equal(item.thumbnailUrl, "thumb");
    },
  };
  await runUpload(j, steps, () => {});
  assert.equal(j.phase, "failed");
  assert.equal(saves, 0);
  assert.equal(batchIncomplete([j]), true);
  await runUpload(j, steps, () => {});
  assert.equal(j.phase, "done");
  assert.equal(thumbs, 1);
  assert.equal(originals, 1);
  assert.equal(uploads, 2);
  assert.equal(saves, 1);
  assert.deepEqual(ids, ["stable-id", "stable-id", "stable-id"]);
  assert.equal(batchIncomplete([j]), false);
  await runUpload(j, steps, () => {});
  assert.equal(saves, 1);
});
test("unsupported or oversized thumbnail never reaches storage", async () => {
  for (const bad of [
    new Blob(["x"], { type: "image/png" }),
    new Blob([new Uint8Array(300 * 1024 + 1)], { type: "image/webp" }),
  ]) {
    const j = job();
    let uploaded = false;
    await runUpload(
      j,
      {
        thumbnail: async () => bad,
        upload: async () => {
          uploaded = true;
          return "x";
        },
        save: async () => assert.fail("must not save"),
      },
      () => {},
    );
    assert.equal(j.phase, "failed");
    assert.equal(uploaded, false);
  }
});
test("lost row response retries row with stable id and never reuploads", async () => {
  const j = job();
  let uploads = 0,
    saves = 0;
  const steps = {
    thumbnail: async () => thumb,
    upload: async () => {
      uploads++;
      return "url";
    },
    save: async (current) => {
      assert.equal(current.id, "stable-id");
      if (++saves === 1) throw new Error("response lost");
    },
  };
  await runUpload(j, steps, () => {});
  assert.equal(j.phase, "failed");
  await runUpload(j, steps, () => {});
  assert.equal(j.phase, "done");
  assert.equal(uploads, 2);
  assert.equal(saves, 2);
});
test("thumbnail decoder failure is recoverable without uploading original", async () => {
  const j = job();
  let attempts = 0;
  const steps = {
    thumbnail: async () => {
      if (++attempts === 1) throw new Error("decode");
      return thumb;
    },
    upload: async () => "url",
    save: async () => {},
  };
  await runUpload(j, steps, () => {});
  assert.equal(j.originalUrl, undefined);
  await runUpload(j, steps, () => {});
  assert.equal(j.phase, "done");
});

test("photo alt fallback handles extension-only and blank names", async () => {
  const { photoAltFromName } = await import("../lib/memories-core.ts");
  assert.equal(photoAltFromName(".jpg"), ".jpg");
  assert.equal(photoAltFromName("  "), "Event photo");
  assert.equal(photoAltFromName("party.jpg"), "party");
});
test("concurrent write failures give useful instructions without retrying", async () => {
  const { memoryWriteError } = await import("../lib/memories-core.ts");
  for (const code of ["40P01", "40001"])
    assert.equal(
      memoryWriteError({ code, message: "db detail" }),
      "Another edit happened at the same time; reload and try again.",
    );
  assert.equal(
    memoryWriteError({ code: "23514", message: "Title required" }),
    "Title required",
  );
});
