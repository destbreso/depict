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
