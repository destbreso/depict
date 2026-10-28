// A rise: a pose whose body turns the whole figure about a point of its own (a shoe onto the tip of its toe, en
// pointe), moving it meanwhile, eased in and out over the time it says.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stump } from "./fixtures.mjs";
import { checkCharacter, resolve } from "../skills/depict/kit/characters/index.mjs";
import { actorAt } from "../skills/depict/kit/act.mjs";
import { FEELINGS } from "../skills/depict/kit/rig.mjs";
import { figure } from "../skills/depict/kit/sheet.mjs";

const dancer = { ...stump, id: "dancer", poses: { ...stump.poses, pointe: { body: { pivot: [0.2, 0.99], turn: 60, shift: [-0.2, 0], stretch: 0.02, ease: 0.6 } }, balance: { body: { pivot: [0, 0.99], sway: [4, 1.2] } } } };
const actor = (arms) => ({ h: 300, armless: true, poses: resolve(dancer).poses, feelings: FEELINGS, motion: {}, eyes: [[0, -200]], track: { start: [0, 0, 1], appear: [0, 0], moves: [], turns: [], arms, feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [] } });

test("a pose that turns about a point of its own is a pose, and a turn needs its point", () => {
  assert.deepEqual(checkCharacter(dancer), []);
  assert.match(checkCharacter({ ...dancer, poses: { pointe: { body: { turn: 40 } } } }).join("\n"), /poses\.pointe\.body/);
  assert.match(checkCharacter({ ...dancer, poses: { pointe: { body: { pivot: [0, 1], ease: 0 } } } }).join("\n"), /poses\.pointe\.body/);
});

test("it rises onto its point over the time the pose says, holds there, and comes down as slowly", () => {
  const A = actor([[0, "rest"], [2, "pointe"], [6, "rest"]]);
  assert.equal(actorAt(A, 1).rise, undefined);
  const rising = actorAt(A, 2.3).rise;
  assert.ok(rising.turn > 5 && rising.turn < 55, `half way up: ${rising.turn}`);
  const up = actorAt(A, 4).rise;
  assert.equal(up.turn, 60);
  assert.deepEqual(up.pivot, [60, 0]);
  assert.deepEqual(up.shift, [-60, 0]);
  const down = actorAt(A, 6.3).rise;
  assert.ok(down.turn > 5 && down.turn < 55, "it comes down over the same time");
  assert.equal(actorAt(A, 7).rise, undefined);
});

test("balancing on its point rocks it about that point, not about its feet", () => {
  const A = actor([[0, "balance"]]);
  const a = actorAt(A, 2.3);
  const b = actorAt(A, 2.9);
  assert.equal(a.lean, 0);
  assert.ok(Math.sign(a.rise.turn) !== Math.sign(b.rise.turn), `rocks: ${a.rise.turn} then ${b.rise.turn}`);
  assert.deepEqual(a.rise.pivot, [0, 0]);
});

test("its sheet draws it risen on its point", () => {
  assert.match(figure({ character: dancer }, { pose: "pointe" }), /scale\([^)]*\) translate\(-[\d.]+ 0\.0\) rotate\(60\.00 [\d.]+ 0\.0\)/);
});
