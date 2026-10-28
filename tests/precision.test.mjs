// A character that says the precision its drawing needs (`precision`, a share of its height) has a compact look: its
// strokes as whole steps of that size, each from the one before, with its parts and colors in tables (version 2); a
// page casting it unpacks them. Every other look is written as before (version 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { stump } from "./fixtures.mjs";
import { checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { castProblem, recast, unpacked } from "../skills/depict/kit/act.mjs";
import { lookOf } from "../skills/depict/kit/look.mjs";

// (the same id, so its look is drawn with the same pen as the stump's)
const fine = { ...stump, precision: 0.002 };

test("a character says the precision its drawing needs, within reason", () => {
  assert.deepEqual(checkCharacter(fine), []);
  assert.match(checkCharacter({ ...fine, precision: 0.02 }).join("\n"), /"precision"/);
  assert.match(checkCharacter({ ...fine, precision: -1 }).join("\n"), /"precision"/);
});

test("its look keeps every stroke to that precision, compact, and a page unpacks it to the same strokes", () => {
  const plain = lookOf(stump);
  const look = lookOf(fine);
  assert.equal(plain.version, 1);
  assert.equal(look.version, 2);
  assert.equal(look.unit, Math.round(0.002 * plain.h * 1e4) / 1e4);
  assert.ok(JSON.stringify(look).length < JSON.stringify(plain).length * 0.7);
  const back = unpacked(look);
  assert.equal(back.strokes.length, plain.strokes.length);
  back.strokes.forEach((s, i) => {
    const o = plain.strokes[i];
    assert.deepEqual([s.part, s.n, s.w, s.c, s.l, s.o], [o.part, o.n, o.w, o.c, o.l, o.o]);
    // every point within half a step (and the tenth the plain look rounds to)
    s.pts.forEach((v, j) => assert.ok(Math.abs(v - o.pts[j]) <= look.unit / 2 + 0.051, `${s.part} ${j}: ${v} against ${o.pts[j]}`));
  });
  for (const w of Object.keys(plain.wear)) assert.equal(back.wear[w].length, plain.wear[w].length);
  // a board takes it as it takes any look
  const A = { h: plain.h, contract: plain.contract, accent: 0, wear: [], strokes: [], reveal: {}, track: { start: [0, 0, 1], appear: [0, 1], moves: [], turns: [], arms: [], feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [], intro: null }, slot: null };
  assert.equal(castProblem(A, look), null);
  assert.equal(recast(A, look, ["#1b1b19"]).strokes.length, plain.strokes.length);
});

// the stump with its body's fill kept as its shape, to within a unit of the page
const kept = {
  ...fine,
  draw(k) {
    const shape = k.shape;
    return fine.draw({ ...k, shape: (part, uv, color, o = {}) => shape(part, uv, color, { ...o, keep: 1 }) });
  },
};

test("a fill its look keeps as its shape is colored in by the page as the board that drew it colored it", async () => {
  const { rig } = await import("../skills/depict/kit/rig.mjs");
  const ink = await import("../skills/depict/kit/ink.mjs");
  const { splitmix32 } = await import("../skills/depict/kit/rng.mjs");
  const { SIZE, W } = await import("../skills/depict/kit/compose.mjs");
  const { hash32 } = await import("../skills/depict/kit/rng.mjs");
  const { characterOf } = await import("../skills/depict/kit/characters/index.mjs");
  const h = SIZE.guide * (characterOf({ character: kept }).size ?? 1);
  const look = lookOf(kept);
  assert.ok(look.fills.length > 0);
  assert.ok(look.strokes.length < lookOf(fine).strokes.length);
  // the look's own drawing, as the board draws it: the same strokes, the kept fills colored in again by the page
  const r = rig(ink.pen(splitmix32(hash32(`look:${kept.id}`)), { width: W.icon }), h, "accent", { character: kept });
  const back = unpacked(look).strokes;
  assert.deepEqual(back.map((s) => [s.part, s.n]), r.strokes.map((s) => [s.part, s.n]));
  r.strokes.forEach((s, i) => {
    if (!s.kept) return;
    assert.equal(back[i].pts.length, s.pts.length);
    s.pts.forEach((v, j) => assert.ok(Math.abs(v - back[i].pts[j]) < 1e-6));
  });
  // and every stroke it does not keep is drawn as it would have been with the fill drawn as any other (the shared pen
  // spends what it would have)
  const plain = rig(ink.pen(splitmix32(hash32(`look:${kept.id}`)), { width: W.icon }), h, "accent", { character: fine });
  r.strokes.forEach((s, i) => !s.kept && assert.deepEqual(s.pts, plain.strokes[i].pts));
});

test("what is drawn once and drawn again elsewhere is kept once, and a page draws it again where it was", () => {
  // the stump with a star on its body drawn again, moved, in three places (and once turned)
  const starred = {
    ...fine,
    costumes: {
      stars: {
        top: 0,
        draw(k) {
          const once = k.drawn(() => k.shape("wear", k.disc(0, 0.5, 0.05, 0.05, 10), "#f2c23a"));
          k.again(once, "wear", [1, 0, 0, 1, 20, 0]);
          k.again(once, "wear", [1, 0, 0, 1, -20, 0]);
          k.again(once, "wear", [0, 1, -1, 0, 0, -30]);
        },
      },
    },
    outfits: [{ name: "stars", wear: ["stars"] }],
  };
  const look = lookOf(starred);
  const packed = look.wear.stars;
  assert.equal(packed.filter((a) => a[0] < 0).length, 3);
  const back = unpacked(look).wear.stars;
  const first = back.filter((s, i) => i < packed[0].length);
  const n = back.length / 4;
  assert.equal(back.length % 4, 0);
  for (let j = 0; j < n; j++) {
    const s = back[j];
    const moved = back[n + j];
    moved.pts.forEach((v, i) => assert.ok(Math.abs(v - (s.pts[i] + (i % 2 ? 0 : 20))) <= look.unit, `${i}`));
    const turned = back[3 * n + j];
    turned.pts.forEach((v, i) => assert.ok(Math.abs(v - (i % 2 ? s.pts[i - 1] - 30 : -s.pts[i + 1])) <= look.unit));
  }
  assert.ok(first.length);
});
