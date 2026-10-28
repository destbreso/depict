// A view can share the standing face: drawn once inside k.face, it is drawn again in each view that says where it is
// there (an affine for the whole face, or one for each eye's side and one for the mouths, null where it is hidden),
// and a look keeps it once, the page drawing it again in each view.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stump } from "./fixtures.mjs";
import { checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { recast } from "../skills/depict/kit/act.mjs";
import { rig } from "../skills/depict/kit/rig.mjs";
import { lookOf } from "../skills/depict/kit/look.mjs";
import * as ink from "../skills/depict/kit/ink.mjs";
import { splitmix32 } from "../skills/depict/kit/rng.mjs";

// a stump whose face is drawn once and shared: moved and made larger facing the viewer, and in its side view with
// only one eye's side seen (the other eye and its brow hidden round the edge)
const BIG = [1.2, 0, 0, 1.2, 10, -6];
const ONE = { eye0: [0.5, 0, 0, 1, 4, 0], eye1: null, mouth: [0.5, 0, 0, 1, 4, 0] };
const sharer = {
  ...stump,
  id: "sharer",
  views: { front: { hat: [0, -0.1], middle: 0.5 }, side: { hat: [0, -0.1], middle: 0.5 } },
  poses: { ...stump.poses, wave: { view: "front", body: { sway: [5, 0.5] } } },
  draw(k) {
    k.shape("body", k.disc(0, 0.55, 0.2, 0.44), "#a0a0a0");
    const eyes = k.face(() => {
      const at = [k.P(-0.07, 0.4), k.P(0.07, 0.4)];
      at.forEach(([x, y], i) => k.add(`eye${i}`, "eye", ink.ellipse(k.p, x, y, 6, 8, { closed: true }), 2));
      at.forEach(([x, y], i) => k.add(`pupil${i}`, "pupil", [[x, y, x + 1, y]], 5));
      k.add("brows:high", "brow", at.map(([x, y]) => [x - 5, y - 14, x + 5, y - 15]), 2);
      k.add("mouth:smile", "mouth", [[k.P(-0.03, 0.5), k.P(0.03, 0.5)].flat()], 2);
      return at;
    });
    k.view("front", () => {
      k.shape("body", k.disc(0, 0.55, 0.25, 0.44), "#123456");
      return { face: BIG };
    });
    k.view("side", () => {
      k.shape("body", k.disc(0, 0.55, 0.12, 0.44), "#654321");
      return { face: ONE };
    });
    return { eyes };
  },
};
const draw = () => rig(ink.pen(splitmix32(3), { width: 4 }), 205.2, "#c43f0a", { character: sharer });
const move = (m, pts) => pts.map((v, i) => (i % 2 ? m[1] * pts[i - 1] + m[3] * v + m[5] : m[0] * v + m[2] * pts[i + 1] + m[4]));

test("a view that shares the standing face has it drawn again where it says, each side by its own affine", () => {
  assert.deepEqual(checkCharacter(sharer), []);
  const r = draw();
  const own = r.strokes.filter((s) => s.part.charCodeAt(0) !== 64 && /^(eye|pupil|brows|mouth)/.test(s.part));
  const front = r.strokes.filter((s) => s.part.startsWith("@front:") && /^@front:(eye|pupil|brows|mouth)/.test(s.part));
  // the whole face, moved and larger, its lines as much wider
  assert.equal(front.length, own.length);
  front.forEach((s, i) => {
    assert.equal(s.part, `@front:${own[i].part}`);
    assert.deepEqual(s.pts, move(BIG, own[i].pts));
    assert.ok(Math.abs(s.w - own[i].w * 1.2) < 1e-9);
  });
  assert.deepEqual(r.views.front.eyes, r.eyes.map((e) => move(BIG, e)));
  // in the side view only the first eye's side and the mouth: its eye, its pupil, its brow
  const side = r.strokes.filter((s) => s.part.startsWith("@side:") && s.part !== "@side:body").map((s) => s.part);
  assert.deepEqual(side, ["@side:eye0", "@side:pupil0", "@side:brows:high", "@side:mouth:smile"]);
});

test("a look keeps the shared face once, and a page casting it draws it again in each view as the board does", () => {
  const look = lookOf(sharer);
  assert.ok(!look.strokes.some((s) => /^@(front|side):(eye|pupil|brows|mouth)/.test(s.part)));
  assert.deepEqual(look.views.front.face, { eye0: BIG, eye1: BIG, mouth: BIG });
  assert.equal(look.views.side.face.eye1, null);
  const A = { h: 205.2, contract: sharer.id, accent: 0, wear: [], strokes: [], reveal: {}, track: { start: [0, 0, 1], appear: [0, 1], moves: [], turns: [], arms: [], feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [], intro: null }, slot: null };
  const cast = recast(A, look, ["#1b1b19"]);
  // the standing face's strokes, moved by each view's affine for their side (the hidden side left out)
  const face = look.strokes.filter((s) => s.f);
  const want = [];
  for (const [v, m] of [["front", BIG], ["side", ONE]])
    for (const s of face) {
      const side = /^mouth:/.test(s.part) ? "mouth" : (s.pts[0] < (look.eyes[0][0] + look.eyes[1][0]) / 2) === (look.eyes[0][0] < (look.eyes[0][0] + look.eyes[1][0]) / 2) ? "eye0" : "eye1";
      const M = Array.isArray(m) ? m : m[side];
      if (M) want.push({ part: `@${v}:${s.part}`, pts: move(M, s.pts) });
    }
  const got = cast.strokes.filter((s) => /^@(front|side):(eye|pupil|brows|mouth)/.test(s.part));
  assert.deepEqual(got.map((s) => s.part), want.map((s) => s.part));
  got.forEach((s, i) => assert.deepEqual(s.pts, want[i].pts));
  // and the board's own drawing has the same strokes in each view
  assert.deepEqual(draw().strokes.filter((s) => /^@(front|side):(eye|pupil|brows|mouth)/.test(s.part)).map((s) => s.part), want.map((s) => s.part));
});

test("a character without a shared face is drawn as before: no stroke of it is marked as a face's", () => {
  const r = rig(ink.pen(splitmix32(3), { width: 4 }), 205.2, "#c43f0a", { character: stump });
  assert.ok(!r.strokes.some((s) => s.face || s.copy));
  assert.ok(!lookOf(stump).strokes.some((s) => s.f));
});
