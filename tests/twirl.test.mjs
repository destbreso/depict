// A twirl: it crouches, springs up, turns round once on itself in the air and lands soft. A solid drawn all the way
// round turns through its drawings, never narrowing; one drawn only round its front cannot twirl; a flat character's
// drawing turns round as a spin turns it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { turner, stump } from "./fixtures.mjs";
import { allRound, checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { actorAt, INTROS, TWIRL } from "../skills/depict/kit/act.mjs";
import { FEELINGS, rig } from "../skills/depict/kit/rig.mjs";
import * as ink from "../skills/depict/kit/ink.mjs";
import { splitmix32 } from "../skills/depict/kit/rng.mjs";

// the turner drawn all the way round: standing at 50 degrees, and every 20 degrees from its back (-90) to its front
const ANGLES = [-90, -70, -50, -30, -10, 10, 30, 70, 90];
const rounder = {
  ...turner,
  id: "rounder",
  yaw: 50,
  personality: { ...turner.personality, intros: ["twirl"], outros: ["wave"] },
  views: { ...turner.views, front: { ...turner.views.front, yaw: 90 }, ...Object.fromEntries(ANGLES.filter((y) => y !== 90).map((y) => [`at${y < 0 ? "m" : ""}${Math.abs(y)}`, { yaw: y, between: true, middle: 0.5 }])) },
  draw(k) {
    const out = turner.draw(k);
    for (const y of ANGLES.filter((a) => a !== 90)) k.view(`at${y < 0 ? "m" : ""}${Math.abs(y)}`, () => (k.shape("body", k.disc(0, 0.55, 0.2 + y / 900, 0.44), "#777777"), { eyes: [] }));
    return out;
  },
};
const front = { ...rounder, views: { front: rounder.views.front }, draw: turner.draw };

const actorOf = (C, track) => {
  const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: C });
  return { h: 300, armless: true, views: r.views, ...(r.yaw != null ? { yaw: r.yaw } : {}), poses: r.poses, feelings: FEELINGS, motion: { squash: 1.3, stretch: 1.3, freq: 10, damp: 3.6 }, eyes: r.eyes, track };
};
const twirled = (C) => {
  const k = { start: [0, 0, 1], appear: [0, 0], moves: [], turns: [], arms: [[0, "rest"]], feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [] };
  const ready = INTROS.twirl(k, 1, { x: 0, y: 0, facing: 1 });
  return { A: actorOf(C, k), ready };
};

test("only a solid drawn all the way round can twirl or spin; any flat character can", () => {
  assert.ok(allRound(rounder));
  assert.ok(!allRound(front));
  assert.deepEqual(checkCharacter(rounder), []);
  assert.match(checkCharacter({ ...front, personality: { ...front.personality, intros: ["twirl"] } }).join("\n"), /twirl/);
  assert.deepEqual(checkCharacter({ ...stump, personality: { ...stump.personality, intros: ["twirl"] } }), []);
});

test("a twirl crouches, springs up, turns round once in the air through every drawing, and lands soft, with no jolt", () => {
  const { A, ready } = twirled(rounder);
  const up = 1 + TWIRL.crouch;
  const down = up + TWIRL.air;
  assert.ok(ready > down + 0.6);
  let prev = null;
  const seen = new Set();
  let deepest = 1;
  for (let t = 0.9; t < down + 1.2; t += 1 / 120) {
    const st = actorAt(A, t);
    if (t > up && t < down) assert.ok(st.lift > 0);
    if (t < up - 1e-9 || t > down + 1e-9) assert.equal(st.lift, 0);
    if (t > down) deepest = Math.min(deepest, st.sy);
    seen.add(`${st.view ?? "standing"}${st.mirror ? " mirrored" : ""}`);
    if (prev) {
      // no frame jumps: its squash, its stretch and its turn all change a little at a time (at 120 frames a second)
      assert.ok(Math.abs(st.sy - prev.sy) < 0.03, `squash jumps at ${t.toFixed(3)}`);
      assert.ok(Math.abs(st.yaw - prev.yaw) < 9, `turn jumps at ${t.toFixed(3)}`);
    }
    prev = st;
  }
  // it squashed as it landed, softly, and it was seen in every drawing it has, each facing both ways
  assert.ok(deepest < 0.92 && deepest > 0.8);
  for (const v of Object.keys(rounder.views).filter((v) => v !== "front")) assert.ok(seen.has(v) || seen.has(`${v} mirrored`), v);
  // and round once: it lands where it began, its turn carrying on a little past and settling back
  assert.ok(Math.abs(actorAt(A, down).yaw - (50 + 360)) < 1);
  assert.ok(actorAt(A, down + 0.08).yaw > 50 + 360 + 5);
  assert.ok(Math.abs(actorAt(A, down + 0.38).yaw - (50 + 360)) < 2);
});

test("a flat character's twirl turns its drawing round as a spin does, narrowing to its edge and back", () => {
  const { A } = twirled(stump);
  const up = 1 + TWIRL.crouch;
  const down = up + TWIRL.air;
  const widths = [];
  for (let t = up; t < down; t += 0.01) widths.push(actorAt(A, t).sx);
  assert.ok(Math.min(...widths) < 0.1);
  assert.ok(actorAt(A, down + 0.3).sx > 0.9);
});
