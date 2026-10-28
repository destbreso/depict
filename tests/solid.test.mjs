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
import { figure } from "../skills/depict/kit/sheet.mjs";
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

// the solid risen onto its point: drawings at 15 and 30 degrees, each standing on its own point
const RISEN = "#0a0b0c";
const riser = {
  ...solid,
  id: "riser",
  views: { ...solid.views, "rise-15": { yaw: 50, pitch: 15, pivot: [0.2, 0.99], between: true }, "rise-30": { yaw: 50, pitch: 30, pivot: [0.25, 0.99], between: true } },
  poses: { ...solid.poses, tiptoe: { body: { pivot: [0.1, 0.99], turn: 28, shift: [-0.1, 0.05], ease: 0.3 } } },
  draw(k) {
    const out = solid.draw(k);
    for (const v of ["rise-15", "rise-30"]) k.view(v, () => (k.shape("body", k.disc(0.1, 0.5, 0.2, 0.45), RISEN), { eyes: [k.P(0, 0.3), k.P(0.1, 0.3)] }));
    return out;
  },
};

test("a solid rises in its drawings risen onto its point, turned only by what is left about the point it stands on there", () => {
  assert.deepEqual(checkCharacter(riser), []);
  assert.match(checkCharacter({ ...riser, views: { ...riser.views, "rise-15": { yaw: 50, pitch: 15 } } }).join("\n"), /views\.rise-15\.pitch/);
  const A = actorOf(riser, [[0, "rest"], [2, "tiptoe"], [9, "rest"]]);
  assert.equal(actorAt(A, 1).rise, undefined);
  const seen = [];
  for (let t = 1.95; t < 2.4; t += 0.01) {
    const st = actorAt(A, t);
    if (seen.at(-1) !== (st.view ?? "standing")) seen.push(st.view ?? "standing");
  }
  assert.deepEqual(seen, ["standing", "rise-15", "rise-30"]);
  const up = actorAt(A, 5);
  assert.equal(up.view, "rise-30");
  assert.equal(up.rise.turn, -2, "what is left of the rise turns it about its point there");
  assert.deepEqual(up.rise.pivot, [0.25 * 300, 0]);
  assert.deepEqual(up.rise.shift, [0, 0], "its drawings stand where they are drawn");
  // its sheet draws it risen too, and one with no risen drawings still turns its drawing about its point
  const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: riser });
  assert.ok(r.views["rise-30"].pitch === 30);
  assert.ok(figure({ character: riser }, { pose: "tiptoe" }).includes(RISEN));
  assert.ok(!figure({ character: riser }, { pose: "rest" }).includes(RISEN));
  const flatRise = actorAt(actorOf({ ...solid, poses: riser.poses }, [[0, "rest"], [2, "tiptoe"]]), 5);
  assert.equal(flatRise.view, undefined);
  assert.equal(flatRise.rise.turn, 28);
});

test("a solid turns on its sole: a turn waits until it has come down, or it comes down to turn, then rises again", () => {
  // it comes down from tiptoe at 5 as it turns to face the other way: the turn waits until it is down
  const A = actorOf(riser, [[0, "rest"], [2, "tiptoe"], [5, "rest"]], [[5, -1]]);
  const early = actorAt(A, 5.1);
  assert.ok(early.yaw === 50 && early.mirror === 1, "still facing its old way as it comes down");
  assert.ok(actorAt(A, 5.6).yaw > 50, "and turning once it is down");
  // it turns to face the other way while it stays on tiptoe: it comes down to turn, turns, and rises again
  const B = actorOf(riser, [[0, "rest"], [2, "tiptoe"], [9, "rest"]], [[5, -1]]);
  // how far it is risen: its drawing's angle and what is left of the rise
  const risen = (t) => {
    const st = actorAt(B, t);
    return (riser.views[st.view]?.pitch ?? 0) + (st.rise?.turn ?? 0);
  };
  assert.ok(Math.abs(risen(4.9) - 28) < 1e-9, "risen before");
  assert.ok(risen(5.05) < 28 && risen(5.15) < risen(5.05) && actorAt(B, 5.15).yaw === 50, "coming down, not yet turning");
  assert.equal(risen(5.3), 0);
  const turning = actorAt(B, 5.45);
  assert.ok(turning.rise == null && turning.yaw > 50 && turning.yaw < 130, "down, and turning");
  const again = actorAt(B, 6.5);
  assert.equal(again.view, "rise-30");
  assert.equal(again.facing, -1);
  assert.equal(again.mirror, undefined, "risen again, facing its new way");
  for (let t = 4.8; t < 6.6; t += 1 / 60) assert.ok(Math.abs(actorAt(B, t).sx - 1) < 0.05);
});
