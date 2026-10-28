// A character's whole body as what it shows things with: a character with no arms (arm: false) leans, bends,
// stretches and looks where another would point, wave or cheer with its hands.
import { test } from "node:test";
import assert from "node:assert/strict";
import pencil from "../skills/depict/examples/friends/pencil.mjs";
import { stump } from "./fixtures.mjs";
import { checkCharacter, resolve } from "../skills/depict/kit/characters/index.mjs";
import { actorAt, GESTURES, recast } from "../skills/depict/kit/act.mjs";
import { FEELINGS, rig } from "../skills/depict/kit/rig.mjs";
import { lookOf, fitsContract } from "../skills/depict/kit/look.mjs";
import { figure } from "../skills/depict/kit/sheet.mjs";
import { normalize } from "../skills/depict/kit/model.mjs";
import { compose } from "../skills/depict/kit/compose.mjs";
import { time } from "../skills/depict/kit/timeline.mjs";
import { hand } from "../skills/depict/kit/fonts.mjs";
import { sceneOf } from "../skills/depict/kit/page.mjs";
import * as ink from "../skills/depict/kit/ink.mjs";
import { splitmix32 } from "../skills/depict/kit/rng.mjs";


const build = (input) => {
  const { board, errors } = normalize(input);
  assert.deepEqual(errors, []);
  const comp = compose(board, hand(board.hand));
  return { board, comp, tl: time(board, comp) };
};
const tiny = (guide) => ({
  title: "A tiny board",
  guide,
  regions: [{ id: "r", title: "Two things", items: [{ id: "a", icon: "cpu", label: "One" }, { id: "b", icon: "database", label: "Two" }] }],
  beats: [
    { say: "Here is the first thing.", draw: ["title", "a"] },
    { say: "And here is the second.", draw: ["r", "b"], mark: [{ circle: "b" }] },
  ],
});

test("a character with no arms is a character: its poses are its body's, the kit's own where it says none", () => {
  assert.deepEqual(checkCharacter(stump), []);
  const C = resolve(stump);
  for (const name of Object.keys(GESTURES)) assert.deepEqual(C.poses[name], { body: GESTURES[name] });
  assert.ok(C.poses.glance.body, "its own poses join the kit's");
  // a hand pose is not one it can have, and a body says only what a body can do
  assert.match(checkCharacter({ ...stump, poses: { wave: { front: { hand: [0, 0], bow: [0, 0], glove: "open" } } } }).join("\n"), /poses\.wave/);
  assert.match(checkCharacter({ ...stump, poses: { glance: { body: { wiggle: 3 } } } }).join("\n"), /poses\.glance\.body/);
  // and drawn to Stuart's slot, it fits it with no hands to measure
  assert.deepEqual(fitsContract(stump), []);
});

test("its rig has no arms or hands, and holds nothing even when asked", () => {
  const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: stump, hold: "book" });
  assert.equal(r.armless, true);
  assert.deepEqual(r.gloves, {});
  assert.deepEqual(r.arm, { width: 0, hose: [] });
  assert.equal(r.hold, null);
  assert.equal(r.strokes.filter((s) => s.part === "held").length, 0);
  assert.match(normalize({ ...tiny({ character: stump, hold: "book" }) }).errors.join("\n"), /no arms to hold/);
});

test("it shows a thing by bending toward it and looking, and waves by rocking", () => {
  const actor = (arms, facing = 1) => ({ h: 300, armless: true, poses: resolve(stump).poses, feelings: FEELINGS, motion: {}, eyes: [[0, -200]], track: { start: [0, 0, facing], appear: [0, 0], moves: [], turns: [], arms, feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [] } });
  const still = actorAt(actor([[0, "rest"]]), 2);
  assert.equal(still.lean, 0);
  assert.equal(still.skew, 0);
  // a thing up and to the right of it: it leans and bends its top toward it, and stretches up to it
  const up = actorAt(actor([[0, "point", 400, -500]]), 2);
  assert.ok(up.lean > 0 && up.skew > 0, `leans ${up.lean} and bends ${up.skew} toward it`);
  assert.ok(up.sy > still.sy, "stretches up toward a thing above it");
  // facing the other way, its top bends the other way on the board, toward the thing
  const left = actorAt(actor([[0, "point", -400, -500]], -1), 2);
  assert.ok(left.skew < 0, "bends toward a thing on its left");
  // a wave rocks it to and fro
  const a = actorAt(actor([[0, "wave"]]), 2.1).lean;
  const b = actorAt(actor([[0, "wave"]]), 2.33).lean;
  assert.ok(Math.sign(a) !== Math.sign(b), `rocks: ${a} then ${b}`);
  // a pose of its own looks where it says (a glance to the side)
  const glance = actorAt(actor([[0, "glance"]]), 2);
  assert.ok(glance.look[0] < 0 && glance.skew < 0);
});

test("its sheet draws it with no arms, its body leaning in a gesture", () => {
  const svg = figure({ character: stump }, { pose: "point" });
  assert.match(svg, /^<path[^>]*\/><g transform="rotate\([\d.]+\) skewX\(-[\d.]+\) scale/);
  const still = figure({ character: stump }, { pose: "rest" });
  assert.match(still, /<g transform="scale/);
});

test("a board it presents, and a look of it cast into a board where Stuart holds a book", () => {
  const { board, comp, tl } = build(tiny({ character: stump }));
  const S = sceneOf(board, comp, tl);
  assert.equal(S.actors[0].armless, true);
  assert.equal(tl.actors[0].rig.reveal.armFront, undefined, "no arm is drawn as it first appears");
  const host = build(tiny({ character: "stuart", hold: "book" }));
  const H = sceneOf(host.board, host.comp, host.tl);
  const look = lookOf(stump);
  assert.equal(look.armless, true);
  const B = recast(H.actors[0], look, [...H.palette], H.elements);
  assert.equal(B.armless, true);
  assert.equal(B.hold, null);
  assert.equal(B.strokes.filter((s) => s.part === "held").length, 0, "the board's book is not in a hand it does not have");
  assert.equal(B.reveal.armFront, undefined);
  // and an armed look cast where it was has its arms again
  const P = recast({ ...S.actors[0] }, lookOf(pencil), [...S.palette], S.elements);
  assert.equal(P.armless, undefined);
});
