// Another view of a character (facing the viewer, at rest as it stands): drawn in k.view(name, ...), taken by the
// poses that say it for as long as they last, with a turn between views, its face alive in every one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stump, turner, FRONT } from "./fixtures.mjs";
import { checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { actorAt, recast, VIEW_TURN } from "../skills/depict/kit/act.mjs";
import { FEELINGS, rig, topOf } from "../skills/depict/kit/rig.mjs";
import { lookOf } from "../skills/depict/kit/look.mjs";
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

test("a character with another view is a character, and its poses name views it has", () => {
  assert.deepEqual(checkCharacter(turner), []);
  assert.match(checkCharacter({ ...turner, poses: { ...turner.poses, wave: { view: "back" } } }).join("\n"), /poses\.wave\.view/);
  assert.match(checkCharacter({ ...turner, views: { front: { hat: 3 } } }).join("\n"), /"views"/);
});

test("its rig draws each view's parts under the view's name, with its own eyes", () => {
  const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: turner });
  assert.ok(r.strokes.some((s) => s.part === "@front:body" && s.c === FRONT));
  assert.ok(r.strokes.some((s) => s.part === "@front:eye1"));
  assert.ok(!r.strokes.some((s) => s.part === "body" && s.c === FRONT), "the standing body is not the front view's");
  assert.equal(r.views.front.eyes.length, 2);
  assert.deepEqual(r.views.front.hat, [0, -30]);
  // a hat on it reaches as high as it does in its highest view
  assert.ok(topOf(turner, "party-hat") > topOf(stump, "party-hat"));
});

test("a pose taken in a view shows that view as long as it lasts, and it turns between views", () => {
  const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: turner });
  const actor = { h: 300, armless: true, views: r.views, poses: r.poses, feelings: FEELINGS, motion: {}, eyes: r.eyes, track: { start: [0, 0, 1], appear: [0, 0], moves: [], turns: [], arms: [[0, "rest"], [2, "present", 400, -300], [9, "rest"]], feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [] } };
  assert.equal(actorAt(actor, 1).view, undefined);
  const turning = actorAt(actor, 2 + VIEW_TURN * 0.4);
  assert.equal(turning.view, undefined, "it still shows its side as it begins to turn");
  assert.ok(turning.sx < 0.5, "narrowing to its edge");
  assert.equal(actorAt(actor, 2 + VIEW_TURN * 0.6).view, "front");
  assert.equal(actorAt(actor, 8.5).view, "front", "held for as long as the pose lasts, with no limit");
  assert.ok(Math.abs(actorAt(actor, 8.5).sx - actorAt(actor, 1).sx) < 0.05);
  assert.equal(actorAt(actor, 9 + VIEW_TURN).view, undefined);
});

test("its sheet draws a pose in its view, and any view asked for", () => {
  const front = figure({ character: turner }, { pose: "present" });
  assert.ok(front.includes(FRONT));
  const standing = figure({ character: turner }, { pose: "rest" });
  assert.ok(!standing.includes(FRONT));
  assert.ok(figure({ character: turner }, { view: "front" }).includes(FRONT));
});

test("a board it presents waits to show a view until a pose takes it, and its look carries its views", () => {
  const { board, comp, tl } = build({
    title: "Two views",
    guide: { character: turner },
    regions: [{ id: "r", title: "One thing", items: [{ id: "a", icon: "cpu", label: "One" }] }],
    beats: [{ say: "Here is a thing.", draw: ["title", "r", "a"] }],
  });
  const S = sceneOf(board, comp, tl);
  const A = S.actors[0];
  assert.equal(A.views.front.eyes.length, 2);
  const viewed = A.strokes.filter((s) => s.part.startsWith("@front:"));
  assert.ok(viewed.length && viewed.every((s) => s.t0 === s.t1), "a view is not drawn by the pen as it first appears");
  const look = lookOf(turner);
  assert.equal(look.views.front.eyes.length, 2);
  const B = recast(A, look, [...S.palette], S.elements);
  assert.equal(B.views.front.eyes.length, 2);
});
