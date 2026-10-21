// A character's own motion: parts that move on their own (a tail), whole-body forms it takes (a cat sits, curls up),
// fidgets (its ears twitch while it looks around), and the pen's closed ring (an eye) and seamless outlines.
import { test } from "node:test";
import assert from "node:assert/strict";
import pencil from "../skills/depict/examples/friends/pencil.mjs";
import { checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { actorAt, FORM_TIME, quirk } from "../skills/depict/kit/act.mjs";
import { FEELINGS, rig } from "../skills/depict/kit/rig.mjs";
import { lookOf } from "../skills/depict/kit/look.mjs";
import * as ink from "../skills/depict/kit/ink.mjs";
import { splitmix32 } from "../skills/depict/kit/rng.mjs";

// the friends example's pencil, given a tail that sways, a form it can take, and ears that twitch in a fidget
const lively = {
  ...pencil,
  id: "lively",
  swing: { tail: { pivot: [-0.1, 0.8], deg: 8, period: 1.5, sides: 6 }, ear: { pivot: [0.05, 0.1], deg: 12, period: 0.3, while: "ears" } },
  fidgets: { ears: { look: "around", time: 1.5 } },
  forms: ["sit"],
  personality: { ...pencil.personality, quirks: ["ears", "sit"] },
  draw(k) {
    const out = pencil.draw(k);
    k.line("tail", [[-0.1, 0.8], [-0.25, 0.6]], k.fine);
    k.line("ear", [[0.05, 0.1], [0.08, 0.02]], k.fine);
    k.shape("form:sit", [[-0.15, 0.6], [0.15, 0.6], [0.15, 0.99], [-0.15, 0.99]], "#cccccc");
    return out;
  },
};

test("a character with parts of its own that move, forms and fidgets is a character", () => {
  assert.deepEqual(checkCharacter(lively), []);
  const bad = { ...lively, swing: { tail: { deg: 8 } }, personality: { ...lively.personality, quirks: ["dance"] } };
  const problems = checkCharacter(bad).join("\n");
  assert.match(problems, /swing\.tail/);
  assert.match(problems, /quirks\.dance/);
  assert.match(checkCharacter({ ...lively, forms: ["wave"] }).join("\n"), /forms/);
});

test("its rig and its look carry what moves on its own, its forms and its fidgets", () => {
  const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: lively });
  assert.deepEqual(Object.keys(r.swing), ["tail", "ear"]);
  assert.equal(r.swing.ear.while, "ears");
  assert.deepEqual(r.forms, ["sit"]);
  const look = lookOf(lively);
  assert.deepEqual(look.forms, ["sit"]);
  assert.ok(look.swing.tail.at.length === 2 && look.fidgets.ears.look === "around");
  // a form's strokes wait, ready, like the faces of the other feelings: none of them is drawn by the pen on arrival
  assert.ok(look.strokes.some((s) => s.part === "form:sit"));
});

test("a form is held while the moment stays quiet, and only when it is long enough", () => {
  const track = { arms: [[0, "rest"], [9, "point"]], moves: [], look: [] };
  assert.equal(quirk(track, "sit", 2, 3, lively), true);
  assert.deepEqual(track.forms, [[2, "sit"], [2 + FORM_TIME - 0.15, null]]);
  // a quiet moment cut short by the next gesture is too short to sit down in
  const short = { arms: [[0, "rest"], [3.2, "point"]], moves: [], look: [] };
  assert.equal(quirk(short, "sit", 2, 3, lively), false);
  assert.equal(short.forms, undefined);
});

test("a fidget twitches its ears while it looks around, and the frame says so", () => {
  const track = { start: [0, 0, 1], appear: [0, 0], moves: [], turns: [], arms: [[0, "rest"]], feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [] };
  quirk(track, "ears", 2, 3, lively);
  assert.equal(track.fidgets[0][2], "ears");
  assert.ok(track.look.filter((l) => l[1] === "dir").length >= 3);
  quirk(track, "sit", 6, 7, lively);
  const actor = { h: 300, eyes: [[0, 0], [10, 0]], shoulders: { front: [10, -150], back: [-10, -150] }, poses: lively.poses, feelings: FEELINGS, motion: {}, reach: 0.3, track };
  const during = actorAt(actor, 2.5);
  assert.equal(during.fidget?.name, "ears");
  assert.ok(during.look[0] !== 0 || during.look[1] !== 0);
  assert.equal(actorAt(actor, 7).form, "sit");
  assert.equal(actorAt(actor, 1).form, null);
});

test("a closed ring ends where it began, so two small eyes come out the same size", () => {
  const p = ink.pen(splitmix32(5), { width: 4 });
  for (let k = 0; k < 6; k++) {
    const [pts] = ink.ellipse(p, 100, 100, 9, 9, { closed: true });
    const radii = [];
    for (let i = 0; i < pts.length; i += 2) radii.push(Math.hypot(pts[i] - 100, pts[i + 1] - 100));
    assert.ok(Math.max(...radii) / Math.min(...radii) < 1.35, `ring ${k}: radii from ${Math.min(...radii).toFixed(1)} to ${Math.max(...radii).toFixed(1)}`);
  }
});

test("an outline leaves out what runs behind the shapes in front of it", () => {
  const strokesOf = (behind) => {
    const C = {
      ...lively,
      id: "seam",
      draw(k) {
        const out = pencil.draw(k);
        k.shape("form:sit", [[-0.1, 0.5], [0.1, 0.5], [0.1, 0.7], [-0.1, 0.7]], "#cccccc", { line: k.fine, behind });
        return out;
      },
    };
    const r = rig(ink.pen(splitmix32(1), { width: 4 }), 300, "#c43f0a", { character: C });
    return r.strokes.filter((s) => s.part === "form:sit" && s.role === "outline");
  };
  assert.equal(strokesOf(null).length, 1);
  // a shape in front covering the square's top half: what is left of its outline is one open run round the bottom
  const cut = strokesOf([[[-0.2, 0.4], [0.2, 0.4], [0.2, 0.6], [-0.2, 0.6]]]);
  assert.equal(cut.length, 1);
  const ys = [];
  for (let i = 1; i < cut[0].pts.length; i += 2) ys.push(cut[0].pts[i]);
  assert.ok(Math.min(...ys) > (0.6 - 0.99) * 300 - 2, "nothing of the outline is left inside the shape in front");
});
