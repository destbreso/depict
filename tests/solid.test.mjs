// A character drawn from a modelled shape turns by rotating it: at each moment of a turn it is seen in the drawing of
// the nearest angle it has, never narrowed to its edge; a flat character turns as before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { turner } from "./fixtures.mjs";
import { checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { actorAt, recast, VIEW_TURN } from "../skills/depict/kit/act.mjs";
import { FEELINGS, rig } from "../skills/depict/kit/rig.mjs";
import { lookOf } from "../skills/depict/kit/look.mjs";
import { normalize } from "../skills/depict/kit/model.mjs";
import { compose } from "../skills/depict/kit/compose.mjs";
import { time } from "../skills/depict/kit/timeline.mjs";
import { hand } from "../skills/depict/kit/fonts.mjs";
import { sceneOf } from "../skills/depict/kit/page.mjs";
import * as ink from "../skills/depict/kit/ink.mjs";
import { splitmix32 } from "../skills/depict/kit/rng.mjs";

// the turner seen from 50 degrees standing and 90 facing the viewer, with a drawing at 70 that only a turn passes through
const MID = "#654321";
const solid = {
  ...turner,
  id: "solid",
  yaw: 50,
  personality: { ...turner.personality, intros: ["hop", "wave"], outros: ["wave", "bow"] },
  views: { front: { ...turner.views.front, yaw: 90 }, mid: { yaw: 70, between: true, middle: 0.5 } },
  draw(k) {
    const out = turner.draw(k);
    k.view("mid", () => {
      k.shape("body", k.disc(0, 0.55, 0.3, 0.44), MID);
      const eyes = [k.P(-0.06, 0.45), k.P(0.1, 0.45)];
      eyes.forEach(([x, y], i) => k.add(`eye${i}`, "eye", ink.ellipse(k.p, x, y, 6, 8, { closed: true }), 2));
      return { eyes };
    });
    return out;
  },
};

const actorOf = (C, arms, turns = []) => {
  const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: C });
  return { h: 300, armless: true, views: r.views, ...(r.yaw != null ? { yaw: r.yaw } : {}), poses: r.poses, feelings: FEELINGS, motion: {}, eyes: r.eyes, track: { start: [0, 0, 1], appear: [0, 0], moves: [], turns, arms, feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [] } };
};

test("a solid character says the angle of each drawing, and no pose takes one only a turn passes through", () => {
  assert.deepEqual(checkCharacter(solid), []);
  assert.match(checkCharacter({ ...solid, yaw: 200 }).join("\n"), /"yaw"/);
  assert.match(checkCharacter({ ...solid, views: { ...solid.views, front: { hat: [0, -0.1] } } }).join("\n"), /views\.front\.yaw/);
  assert.match(checkCharacter({ ...solid, poses: { ...solid.poses, wave: { view: "mid" } } }).join("\n"), /poses\.wave\.view/);
  assert.match(checkCharacter({ ...solid, personality: { ...solid.personality, intros: ["spin"] } }).join("\n"), /spin/);
  const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: solid });
  assert.equal(r.yaw, 50);
  assert.deepEqual([r.views.mid.yaw, r.views.mid.between, r.views.front.yaw], [70, true, 90]);
});

test("into another view it rotates through the drawings in between, never narrowing", () => {
  const A = actorOf(solid, [[0, "rest"], [2, "present", 400, -300], [9, "rest"]]);
  const rest = actorAt(A, 1);
  const seen = [];
  for (let t = 1.9; t < 2 + VIEW_TURN + 0.1; t += 0.01) {
    const st = actorAt(A, t);
    assert.ok(Math.abs(st.sx - rest.sx) < 0.05, `its width at ${t.toFixed(2)} s`);
    if (seen.at(-1) !== (st.view ?? "standing")) seen.push(st.view ?? "standing");
  }
  assert.deepEqual(seen, ["standing", "mid", "front"]);
  // and back again when the pose ends
  assert.equal(actorAt(A, 9 + VIEW_TURN / 2).view, "mid");
  assert.equal(actorAt(A, 9 + VIEW_TURN + 0.01).view, undefined);
});

test("turning to face the other way it passes the front, its drawings past it mirrored, its eyes and flips its own way", () => {
  const A = actorOf(solid, [[0, "rest"]], [[3, -1]]);
  const seen = [];
  for (let t = 2.95; t < 3 + VIEW_TURN + 0.05; t += 0.01) {
    const st = actorAt(A, t);
    const shown = `${st.view ?? "standing"}${(st.mirror ?? st.facing) < 0 ? " mirrored" : ""}`;
    if (seen.at(-1) !== shown) seen.push(shown);
    // the drawing is mirrored as the turn has it, whichever way it now faces
    if (st.mirror != null) assert.notEqual(st.mirror, st.facing);
  }
  // (the front drawing, seen square on, faces the way it now faces)
  assert.deepEqual(seen, ["standing", "mid", "front mirrored", "mid mirrored", "standing mirrored"]);
  const half = actorAt({ ...A, track: { ...A.track, look: [[0, "dir", 1, 0]] } }, 3 + VIEW_TURN * 0.3);
  assert.equal(half.mirror, 1);
  assert.ok(half.look[0] < 0, "its eyes keep looking where it looks, in the drawing it is seen in");
});

test("a flat character turns as before, narrowing to its edge, and a look carries the angles into any board", () => {
  const F = actorOf(turner, [[0, "rest"], [2, "present", 400, -300], [9, "rest"]]);
  assert.ok(actorAt(F, 2 + VIEW_TURN * 0.4).sx < 0.5);
  assert.equal(actorAt(actorOf(turner, [[0, "rest"]], [[3, -1]]), 3.1).mirror, undefined);
  const { board, errors } = normalize({ title: "Turning", guide: { character: solid }, regions: [{ id: "r", title: "One thing", items: [{ id: "a", icon: "cpu", label: "One" }] }], beats: [{ say: "Here is a thing.", draw: ["title", "r", "a"] }] });
  assert.deepEqual(errors, []);
  const comp = compose(board, hand(board.hand));
  const S = sceneOf(board, comp, time(board, comp));
  assert.equal(S.actors[0].yaw, 50);
  assert.equal(lookOf(solid).yaw, 50);
  assert.equal(recast(S.actors[0], lookOf(turner), [...S.palette], S.elements).yaw, undefined, "a flat look cast in its place turns flat");
  assert.equal(recast(S.actors[0], lookOf(solid), [...S.palette], S.elements).yaw, 50);
});
