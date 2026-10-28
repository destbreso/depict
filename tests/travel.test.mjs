// Flips and rolls as ways to arrive, leave and travel, and sliding and tiptoeing as ways to travel: a character lists
// the ways it goes from place to place (personality.travel) and each trip between ideas takes them in turn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stump } from "./fixtures.mjs";
import { checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { actorAt, INTROS, OUTROS, travelOf, TRAVEL } from "../skills/depict/kit/act.mjs";
import { FEELINGS, INTROS as INTRO_NAMES, OUTROS as OUTRO_NAMES } from "../skills/depict/kit/rig.mjs";
import { lookOf } from "../skills/depict/kit/look.mjs";
import { normalize } from "../skills/depict/kit/model.mjs";
import { compose } from "../skills/depict/kit/compose.mjs";
import { time } from "../skills/depict/kit/timeline.mjs";
import { hand } from "../skills/depict/kit/fonts.mjs";
import { sceneOf } from "../skills/depict/kit/page.mjs";

const tumbler = { ...stump, id: "tumbler", personality: { ...stump.personality, intros: ["flip", "roll"], outros: ["flip", "roll"], travel: ["hop", "flip", "roll", "slide", "tiptoe"] } };
const blank = () => ({ moves: [], arms: [], feel: [], look: [], bounces: [], spins: [], leans: [], caps: [], turns: [], fidgets: [], forms: [] });
const actor = (track, extra = {}) => ({ h: 300, armless: true, poses: { rest: { body: {} } }, feelings: FEELINGS, motion: {}, eyes: [[0, -200]], ...extra, track: { start: [0, 0, 1], appear: [0, 0], blinks: [], ...blank(), ...track } });

test("a character that travels its own ways is a character, and the ways are the kit's", () => {
  assert.deepEqual(checkCharacter(tumbler), []);
  assert.match(checkCharacter({ ...tumbler, personality: { ...tumbler.personality, travel: ["swim"] } }).join("\n"), /personality\.travel/);
  for (const w of ["flip", "roll"]) assert.ok(INTRO_NAMES.includes(w) && OUTRO_NAMES.includes(w));
  assert.deepEqual(TRAVEL, ["hop", "flip", "roll", "slide", "tiptoe"]);
  assert.deepEqual(lookOf(tumbler).travel, tumbler.personality.travel);
});

test("it arrives with a flip: up, over once about its middle, and down in a pose", () => {
  const k = blank();
  const ready = INTROS.flip(k, 1, { x: 0, y: 0, facing: 1 });
  assert.ok(ready > 2.5);
  const A = actor(k);
  const mid = actorAt(A, 1.5);
  assert.ok(mid.roll > 90 && mid.roll < 270, `turned over half way: ${mid.roll}`);
  assert.ok(mid.lift > 30);
  assert.equal(actorAt(A, 2.2).roll, undefined, "landed");
  assert.ok(k.arms.some((a) => a[1] === "cheer"), "it lands in a pose");
});

test("a roll turns it over along the ground, rising only as far as its body needs", () => {
  const k = blank();
  INTROS.roll(k, 1, { x: 0, y: 0, facing: 1 });
  const at = actorAt(actor(k), 1.55);
  assert.ok(at.roll > 0 && at.roll < 360);
  assert.ok(at.lift <= 0.25 * 300 + 1e-9);
  assert.equal(at.air, 0);
});

test("a trip between ideas takes its ways in turn, and a step only the ways that leave the ground", () => {
  const A = actor({ intro: { seed: 0 } }, { travel: ["hop", "slide", "roll"] });
  const trip = (k) => travelOf(A, { from: [0, 0], to: [600, 0] }, k);
  assert.deepEqual([0, 1, 2, 3].map(trip), ["hop", "slide", "roll", "hop"]);
  assert.equal(travelOf(A, { from: [0, 0], to: [200, 0], step: true }, 1), "hop");
  assert.equal(travelOf(A, { from: [0, 0], to: [0, 0] }, 0), null, "a hop where it stands is the arrival's own");
  assert.equal(travelOf(actor({}), { from: [0, 0], to: [600, 0] }, 0), null, "a character with no ways of its own hops");
});

test("it slides along the floor leaning back, tiptoes in quick little steps, and rolls over on its way", () => {
  const go = (way) => actor({ moves: [{ t0: 1, t1: 3, from: [0, 0], to: [900, 0], hops: 2, height: 120, facing: 1, land: 1, way }] });
  const slide = actorAt(go("slide"), 2);
  assert.equal(slide.lift, 0);
  assert.ok(slide.lean < 0, "leaning back into the slide");
  const tip = [1.5, 1.55, 1.6, 1.65, 1.7].map((t) => actorAt(go("tiptoe"), t).lift);
  assert.ok(Math.max(...tip) <= 0.05 * 300 + 1e-9 && Math.max(...tip) > 0, "little steps, close to the ground");
  const roll = actorAt(go("roll"), 2);
  assert.ok(roll.roll > 0);
  const hop = actorAt(go(undefined), 2);
  assert.equal(hop.roll, undefined, "a plain hop, as before");
});

test("a board it presents and says goodbye to with a flip away, inside the closing circle", () => {
  const { board, errors } = normalize({ title: "Tumbling", guide: { character: tumbler, intro: "flip", outro: "flip" }, regions: [{ id: "r", title: "One", items: [{ id: "a", icon: "cpu", label: "One" }] }, { id: "s", title: "Two", items: [{ id: "b", icon: "database", label: "Two" }] }], beats: [{ say: "Here is one thing.", draw: ["title", "r", "a"] }, { say: "And over here another.", draw: ["s", "b"] }] });
  assert.deepEqual(errors, []);
  const comp = compose(board, hand(board.hand));
  const tl = time(board, comp);
  const A = sceneOf(board, comp, tl).actors[0];
  assert.deepEqual(A.travel, tumbler.personality.travel);
  const away = A.track.moves.filter((m) => m.way === "flip" && m.from[0] !== m.to[0]);
  assert.equal(away.length, 1, "its goodbye flips it away");
  assert.ok(Math.abs(away[0].to[0] - away[0].from[0]) < 60);
  assert.ok(OUTROS.flip && OUTROS.roll);
});
